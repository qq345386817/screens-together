import AppKit
import CryptoKit
import Foundation

struct Capture: Encodable {
    let file: String
    let source: String
    let capturedOn: String
    let sourceSHA256: String
    let sha256: String
    let width: Int
    let height: Int
}

guard CommandLine.arguments.count == 3 else {
    fatalError("Usage: swift scripts/import-mac-screenshots.swift SOURCE_DIRECTORY YYYY-MM-DD")
}
let input = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let capturedOn = CommandLine.arguments[2]
let datePattern = #"^\d{4}-\d{2}-\d{2}$"#
precondition(capturedOn.range(of: datePattern, options: .regularExpression) != nil)
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let locales = ["en": "en_US", "zh-Hans": "zh_Hans", "zh-Hant": "zh_Hant",
               "es-ES": "es_ES", "fr-FR": "fr_FR", "de-DE": "de_DE", "ja": "ja", "ko": "ko"]
let hash: (Data) -> String = { SHA256.hash(data: $0).map { String(format: "%02x", $0) }.joined() }
var captures: [String: Capture] = [:]

for (locale, slug) in locales.sorted(by: { $0.key < $1.key }) {
    let source = "macos_\(slug)_host.png"
    let bytes = try Data(contentsOf: input.appendingPathComponent(source))
    guard let image = NSBitmapImageRep(data: bytes),
          let output = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: image.pixelsWide,
              pixelsHigh: image.pixelsHigh, bitsPerSample: 8, samplesPerPixel: 4,
              hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
          let context = NSGraphicsContext(bitmapImageRep: output) else {
        fatalError("Cannot decode capture: \(source)")
    }
    // Flatten the capture's transparent window shadow without changing its UI or dimensions.
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    let bounds = NSRect(x: 0, y: 0, width: image.pixelsWide, height: image.pixelsHigh)
    NSColor.white.setFill()
    bounds.fill()
    image.draw(in: bounds)
    NSGraphicsContext.restoreGraphicsState()
    guard let jpeg = output.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) else {
        fatalError("Cannot encode capture: \(source)")
    }
    let file = "images/mac-\(locale).jpg"
    try jpeg.write(to: root.appendingPathComponent(file), options: .atomic)
    captures[locale] = Capture(file: file, source: source, capturedOn: capturedOn,
        sourceSHA256: hash(bytes), sha256: hash(jpeg), width: image.pixelsWide, height: image.pixelsHigh)
    print("Imported \(locale): \(image.pixelsWide)x\(image.pixelsHigh), \(jpeg.count) bytes")
}
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
var manifest = try encoder.encode(captures)
manifest.append(0x0a)
try manifest.write(to: root.appendingPathComponent("images/mac-screenshots.json"), options: .atomic)
