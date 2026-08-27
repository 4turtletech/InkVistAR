require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'TattooAR'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = { :type => 'Proprietary' }
  s.author         = 'InkVistAR'
  s.homepage       = 'https://github.com/4turtletech/InkVistAR'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/4turtletech/InkVistAR.git', :tag => s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.resource_bundles = {
    'TattooARResources' => ['Resources/SkinSegmentation.mlpackage']
  }
  s.frameworks = [
    'ARKit',
    'RealityKit',
    'Vision',
    'CoreML',
    'CoreImage',
    'AVFoundation',
    'Photos',
    'PhotosUI',
    'Accelerate',
    'Combine',
    'SwiftUI',
    'UIKit'
  ]
  s.weak_frameworks = ['SensitiveContentAnalysis']

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
