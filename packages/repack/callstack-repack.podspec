require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name                 = "callstack-repack"
  s.version              = package["version"]
  s.summary              = package["description"]
  s.homepage             = package["homepage"]
  s.license              = package["license"]
  s.authors              = package["author"]
  s.platforms            = { :ios => min_ios_version_supported }
  s.source               = { :git => "https://github.com/callstack/repack.git", :tag => "#{s.version}" }
  s.source_files         = "ios/**/*.{h,m,mm,swift}"
  s.static_framework     = true

  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  s.dependency 'JWTDecode', '~> 3.0.0'
  s.dependency 'SwiftyRSA', '~> 1.7'

  install_modules_dependencies(s)
end
