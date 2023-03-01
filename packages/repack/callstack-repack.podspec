require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "callstack-repack"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/callstack/repack.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }
  
  s.dependency "React-Core"
  s.dependency 'JWTDecode', '~> 3.0'
  s.dependency 'SwiftyRSA'
end
