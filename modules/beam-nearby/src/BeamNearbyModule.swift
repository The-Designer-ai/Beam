import MultipeerConnectivity
import ExpoModulesCore

// ───────────────────────────────────────────────────────────
// BeamNearbyModule — Native Swift wrapper around
// Apple's Multipeer Connectivity framework.
//
// Sending flow:
//   1. startBroadcasting(domainToken:) → advertises service
//   2. Nearby device accepts → connection established
//   3. sendDomain(domainToken:) → transfers the data
//
// Receiving flow:
//   1. startScanning() → browses for nearby broadcasters
//   2. User selects a discovered peer → sends invite
//   3. receiveDomain() → returns the domain token
// ───────────────────────────────────────────────────────────

private let kServiceType = "_beam-domain._tcp"

public class BeamNearbyModule: Module {
  fileprivate var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private lazy var advertiserDelegate = BeamNearbyAdvertiserDelegate(module: self)
  private lazy var browserDelegate = BeamNearbyBrowserDelegate(module: self)
  private lazy var sessionDelegate = BeamNearbySessionDelegate(module: self)
  private var localPeerID: MCPeerID?
  fileprivate var discoveredPeers: [MCPeerID] = []
  private var hasEventListeners = false

  // Callback storage
  private var onPeerFoundHandler: ((String) -> Void)?
  private var onPeerLostHandler: ((String) -> Void)?
  private var onDomainReceivedHandler: ((String) -> Void)?
  private var onInviteReceivedHandler: ((String, ((Bool) -> Void)?) -> Void)?
  private var onStateChangeHandler: ((String) -> Void)?

  // ─── Module Definition ──────────────────────────────────

  public func definition() -> ModuleDefinition {
    Name("BeamNearby")

    // ── Events ──────────────────────────────────────────
    Events("onPeerFound", "onPeerLost", "onDomainReceived", "onStateChange")

    // ── Start broadcasting your domain to nearby devices ─
    AsyncFunction("startBroadcasting") { (displayName: String, domainToken: String) in
      self.cleanup()
      let peerID = MCPeerID(displayName: "\(displayName) - Beam")
      self.localPeerID = peerID
      self.session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)

      self.advertiser = MCNearbyServiceAdvertiser(
        peer: peerID,
        discoveryInfo: ["domain": domainToken],
        serviceType: kServiceType
      )
      self.advertiser?.delegate = self.advertiserDelegate
      self.advertiser?.startAdvertisingPeer()
    }

    // ── Scan for nearby broadcasting devices ─────────────
    AsyncFunction("startScanning") { (displayName: String) in
      self.cleanup()
      self.discoveredPeers.removeAll()

      let peerID = MCPeerID(displayName: "\(displayName) - Beam")
      self.localPeerID = peerID
      self.session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)
      self.session?.delegate = self.sessionDelegate

      self.browser = MCNearbyServiceBrowser(peer: peerID, serviceType: kServiceType)
      self.browser?.delegate = self.browserDelegate
      self.browser?.startBrowsingForPeers()
    }

    // ── Accept an invite from a discovered peer ──────────
    AsyncFunction("acceptInvite") { (peerDisplayName: String) in
      guard let browser = self.browser else { return }
      guard let peer = self.discoveredPeers.first(where: { $0.displayName == peerDisplayName }) else { return }
      guard let session = self.session else { return }

      browser.invitePeer(peer, to: session, withContext: nil, timeout: 30)
    }

    // ── Send domain data to connected peer ───────────────
    AsyncFunction("sendDomain") { (domainToken: String) in
      guard let session = self.session else { return }
      let data = domainToken.data(using: .utf8) ?? Data()
      try session.send(data, toPeers: session.connectedPeers, with: .reliable)
    }

    // ── Stop all nearby activity ─────────────────────────
    AsyncFunction("stop") {
      self.cleanup()
    }

    // ── Get list of discovered peers ─────────────────────
    AsyncFunction("getDiscoveredPeers") { () -> [String] in
      return self.discoveredPeers.map { $0.displayName }
    }

    // ── Updates for React Native side ────────────────────
    Function("onModuleCreate") {
      // Called from JS when the module is mounted
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────

  private func cleanup() {
    advertiser?.stopAdvertisingPeer()
    advertiser?.delegate = nil
    advertiser = nil

    browser?.stopBrowsingForPeers()
    browser?.delegate = nil
    browser = nil

    session?.disconnect()
    session?.delegate = nil
    session = nil

    localPeerID = nil
    discoveredPeers.removeAll()
  }

  deinit {
    cleanup()
  }
}

// ─── MCNearbyServiceAdvertiserDelegate ──────────────────────

private class BeamNearbyAdvertiserDelegate: NSObject, MCNearbyServiceAdvertiserDelegate {
  weak var module: BeamNearbyModule?

  init(module: BeamNearbyModule) {
    self.module = module
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didReceiveInvitationFromPeer peerID: MCPeerID,
    withContext context: Data?,
    invitationHandler: @escaping (Bool, MCSession?) -> Void
  ) {
    // Auto-accept the connection from scanning devices
    invitationHandler(true, module?.session)
    module?.sendEvent("onStateChange", ["state": "connected", "peer": peerID.displayName])
  }

  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: any Error) {
    module?.sendEvent("onStateChange", ["state": "error", "message": error.localizedDescription])
  }
}

// ─── MCNearbyServiceBrowserDelegate ────────────────────────

private class BeamNearbyBrowserDelegate: NSObject, MCNearbyServiceBrowserDelegate {
  weak var module: BeamNearbyModule?

  init(module: BeamNearbyModule) {
    self.module = module
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    foundPeer peerID: MCPeerID,
    withDiscoveryInfo info: [String: String]?
  ) {
    guard let module else { return }
    guard !module.discoveredPeers.contains(where: { $0.displayName == peerID.displayName }) else { return }
    module.discoveredPeers.append(peerID)

    let domainHint = info?["domain"] ?? "unknown"
    module.sendEvent("onPeerFound", [
      "displayName": peerID.displayName,
      "domainToken": domainHint
    ])
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    module?.discoveredPeers.removeAll(where: { $0.displayName == peerID.displayName })
    module?.sendEvent("onPeerLost", ["displayName": peerID.displayName])
  }

  func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: any Error) {
    module?.sendEvent("onStateChange", ["state": "error", "message": error.localizedDescription])
  }
}

// ─── MCSessionDelegate ─────────────────────────────────────

private class BeamNearbySessionDelegate: NSObject, MCSessionDelegate {
  weak var module: BeamNearbyModule?

  init(module: BeamNearbyModule) {
    self.module = module
  }

  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    let stateStr: String
    switch state {
    case .connected:
      stateStr = "connected"
      // Auto-request domain from connected peer
      if let data = "REQUEST_DOMAIN".data(using: .utf8) {
        try? session.send(data, toPeers: [peerID], with: .reliable)
      }
    case .connecting:
      stateStr = "connecting"
    case .notConnected:
      stateStr = "disconnected"
    @unknown default:
      stateStr = "unknown"
    }
    module?.sendEvent("onStateChange", ["state": stateStr, "peer": peerID.displayName])
  }

  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    guard let message = String(data: data, encoding: .utf8) else { return }
    if message == "REQUEST_DOMAIN" {
      // The other side is asking for our domain — handled upstream
      return
    }
    // Received a domain token from the broadcaster
    module?.sendEvent("onDomainReceived", ["domainToken": message, "from": peerID.displayName])
  }

  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {
    // Unused for our data-transfer use case
  }

  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {
    // Unused
  }

  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: (any Error)?) {
    // Unused
  }
}
