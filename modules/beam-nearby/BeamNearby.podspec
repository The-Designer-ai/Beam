Pod::Spec.new do |s|
  s.name         = "BeamNearby"
  s.version      = "1.0.0"
  s.summary      = "Multipeer Connectivity for Beam — Nearby device domain sharing"
  s.homepage     = "https://beam.app"
  s.license      = "MIT"
  s.author       = "Beam"
  s.source       = { :git => "" }
  s.source_files = "**/*.{h,m,mm,swift}"
  s.dependency   "ExpoModulesCore"
end
