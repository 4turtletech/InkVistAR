# Tattoo AR native module

This local Expo module embeds the SwiftUI/ARKit tattoo preview directly in the
InkVistAR iOS application. Android does not discover or compile this module.

## Runtime requirements

- iOS 26 or newer for the current Liquid Glass interface
- LiDAR for rear-camera body placement modes
- TrueDepth for face placement modes
- A native development or production build; this module is unavailable in Expo Go

The original standalone project under `AR/TattooAR` is retained as read-only
source material. The mobile application uses only the production Swift sources,
Core ML model, and native module wrapper stored here.
