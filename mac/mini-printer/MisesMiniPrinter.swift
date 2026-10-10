[Reading 314 lines from start (total: 314 lines, 0 remaining)]


import Foundation
import SwiftUI
import AppKit
import IOBluetooth
import Network
import CoreGraphics
import Combine

private let listenPort: UInt16 = 39381
private let allowedOrigins = Set([
  "https://cdriccarboni.github.io",
  "https://art.acousmatic-theatre.fr",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
])

struct MiniPrinterDevice: Identifiable, Hashable {
  let id: String
  let name: String
}

@MainActor
final class PrinterModel: ObservableObject {
  @Published var devices: [MiniPrinterDevice] = []
  @Published var selectedID: String = ""
  @Published var info = "Démarrage…"
  @Published var lastLabel = "Aucune étiquette reçue"
  @Published var preview: NSImage?
  @Published var isPrinting = false
  private var listener: MisesPrintServer?

  func refresh() {
    let all = (IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice]) ?? []
    let likely = all.compactMap { item -> MiniPrinterDevice? in
      let name = item.name ?? ""
      let upper = name.uppercased()
      guard ["YHK", "WALK", "MINI", "PRINT", "CTP", "SC03", "SC04", "X6"].contains(where: upper.contains) else { return nil }
      return MiniPrinterDevice(id: item.addressString ?? "", name: name)
    }.filter { !$0.id.isEmpty }
    devices = likely.sorted { $0.name < $1.name }
    let saved = UserDefaults.standard.string(forKey: "selectedMiniPrinter") ?? ""
    if !devices.contains(where: { $0.id == selectedID }) {
      selectedID = devices.first(where: { $0.id == saved })?.id ?? devices.first?.id ?? ""
    }
    if devices.isEmpty { info = "Mini-imprimante absente : associe-la dans Réglages Bluetooth." }
    else if listener != nil { info = "Prêt · impression directe (sans Epson)" }
  }
  func select(_ id: String) {
    selectedID = id
    UserDefaults.standard.set(id, forKey: "selectedMiniPrinter")
  }
  func start() {
    refresh()
    if listener == nil {
      do {
        listener = try MisesPrintServer { [weak self] label, png in
          Task { @MainActor in self?.printLabel(label, png: png) }
        }
        info = devices.isEmpty ? "Mini-imprimante non associée sur ce Mac" : "Prêt · impression directe (sans Epson)"
      } catch { info = "Port local indisponible : \(error.localizedDescription)" }
    }
  }
  func printLabel(_ label: String, png: Data) {
    guard !selectedID.isEmpty else { info = "Sélectionne ta YHK avant d’imprimer."; return }
    guard !isPrinting else { info = "Impression en cours : relance après la fin."; return }
    guard png.count <= 2_000_000, let image = NSImage(data: png) else {
      info = "PNG invalide ou trop volumineux"; return
    }
    lastLabel = label
    preview = image
    isPrinting = true
    info = "Connexion Bluetooth vers la mini-imprimante…"
    let address = selectedID
    Task.detached(priority: .userInitiated) { [weak self] in
      do {
        let bytes = try MisesRaster.make(png: png)
        try MisesBluetooth.send(bytes, address: address)
        await MainActor.run {
          self?.isPrinting = false
          self?.info = "Étiquette envoyée à la mini-imprimante · vérifie la sortie papier"
        }
      } catch {
        await MainActor.run {
          self?.isPrinting = false
          self?.info = "Échec Bluetooth : \(error.localizedDescription)"
        }
      }
    }
  }
}

struct MiniPrinterContent: View {
  @EnvironmentObject var model: PrinterModel
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("MISES! · Mini-imprimante").font(.title2.bold())
          Text("Fenêtre dédiée · WalkPrint / YHK · 384 px").font(.caption).foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "printer.fill").font(.title).foregroundStyle(.purple)
      }
      HStack(spacing: 8) {
        Picker("Mini-imprimante", selection: Binding(
          get: { model.selectedID }, set: { model.select($0) }
        )) {
          if model.devices.isEmpty { Text("Aucune imprimante trouvée").tag("") }
          ForEach(model.devices) { device in Text(device.name).tag(device.id) }
        }
        .frame(maxWidth: .infinity)
        Button("Actualiser") { model.refresh() }
      }
      Text(model.info).font(.footnote).foregroundStyle(model.isPrinting ? .orange : .primary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.quaternary.opacity(0.45), in: RoundedRectangle(cornerRadius: 8))
      HStack(alignment: .top, spacing: 12) {
        ZStack {
          RoundedRectangle(cornerRadius: 8).fill(.white)
          if let image = model.preview {
            Image(nsImage: image).resizable().scaledToFit().padding(10)
          } else {
            VStack {
              Image(systemName: "qrcode").font(.system(size: 44))
              Text("Aperçu de l’étiquette").font(.caption)
            }.foregroundStyle(.gray)
          }
        }.frame(width: 160, height: 195)
        VStack(alignment: .leading, spacing: 10) {
          Text("Dernière tâche").font(.headline)
          Text(model.lastLabel).lineLimit(3)
          Text("Lance une impression depuis MISES! sur ton Mac : elle arrive ici et part directement vers la mini-imprimante sélectionnée.").font(.caption).foregroundStyle(.secondary)
          Spacer()
          Text("Aucun dialogue Epson").font(.caption.bold())
        }.frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack {
        Button("Réglages Bluetooth") {
          if let url=URL(string: "x-apple.systempreferences:com.apple.BluetoothSettings") { NSWorkspace.shared.open(url) }
        }
        Spacer()
        Text("Local : 127.0.0.1:\(listenPort)").font(.caption2).foregroundStyle(.secondary)
      }
    }
    .padding(20)
    .frame(width: 520, height: 405)
    .onAppear { model.start() }
  }
}

@main
struct MisesMiniPrinterApp: App {
  @StateObject private var model = PrinterModel()
  var body: some Scene {
    WindowGroup("MISES! · Mini-imprimante") {
      MiniPrinterContent().environmentObject(model)
    }
    .windowResizability(.contentSize)
  }
}

enum MisesRaster {
  static func make(png: Data) throws -> Data {
    guard let image=NSBitmapImageRep(data: png)?.cgImage else {
      throw NSError(domain:"MISES",code:1,userInfo:[NSLocalizedDescriptionKey:"Étiquette PNG illisible"])
    }
    let width=384
    let height=max(1, min(1800, Int((Double(image.height)*384.0 / Double(max(1,image.width))).rounded())))
    var pixels=[UInt8](repeating:255,count:width*height*4)
    guard let space=CGColorSpace(name:CGColorSpace.sRGB),
          let context=pixels.withUnsafeMutableBytes({ ptr in
            CGContext(data:ptr.baseAddress,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:space,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)
          }) else {
      throw NSError(domain:"MISES",code:2,userInfo:[NSLocalizedDescriptionKey:"Impossible de créer le raster"])
    }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x:0,y:0,width:width,height:height))
    context.interpolationQuality = .high
    context.draw(image,in:CGRect(x:0,y:0,width:width,height:height))
    var bytes=[UInt8]()
    bytes.reserveCapacity(2+4+8+(width/8)*height+4)
    bytes += [0x1b,0x40,0x1d,0x49,0xf0,0x19]
    bytes += [0x1d,0x76,0x30,0x00,0x30,0x00,UInt8(height&255),UInt8((height>>8)&255)]
    // Match Android WalkPrint/YHK: rotate raster 180° on paper exit.
    for y in 0..<height {
      for group in 0..<(width/8) {
        var value: UInt8=0
        for bit in 0..<8 {
          let x=width-1-(group*8+bit)
          let i=((height-1-y)*width+x)*4
          let lum=(Int(pixels[i])*299+Int(pixels[i+1])*587+Int(pixels[i+2])*114)/1000
          if lum<150 { value |= UInt8(0x80>>bit) }
        }
        bytes.append(value)
      }
    }
    bytes += [10,10,10,10]
    return Data(bytes)
  }
}

enum MisesBluetooth {
  static func send(_ data: Data,address: String) throws {
    guard let device=IOBluetoothDevice(addressString:address),device.isPaired() else {
      throw NSError(domain:"MISES",code:3,userInfo:[NSLocalizedDescriptionKey:"Mini-imprimante non associée à ce Mac"])
    }
    let upper=(device.name ?? "").uppercased()
    guard ["YHK","WALK","MINI","PRINT","CTP","SC03","SC04","X6"].contains(where: upper.contains) else {
      throw NSError(domain:"MISES",code:4,userInfo:[NSLocalizedDescriptionKey:"Cet appareil n’est pas une mini-imprimante connue"])
    }
    var active: IOBluetoothRFCOMMChannel?
    for id: UInt8 in [1,2] {
      var candidate: IOBluetoothRFCOMMChannel?
      let code=device.openRFCOMMChannelSync(&candidate,withChannelID:id,delegate:nil)
      if code == 0 && candidate != nil { active=candidate; break }
    }
    guard let channel=active else {
      throw NSError(domain:"MISES",code:5,userInfo:[NSLocalizedDescriptionKey:"Connexion RFCOMM refusée (imprimante occupée ou non compatible)"])
    }
    defer { _=channel.close() }
    let mtu=max(24, min(512, Int(channel.getMTU())))
    let raw=[UInt8](data)
    // ESC @ + YHK start sequence, as in the existing Android printer bridge.
    let first=[UInt8](raw.prefix(2))
    let second=[UInt8](raw.dropFirst(2).prefix(4))
    let raster=[UInt8](raw.dropFirst(6))
    func write(_ bytes:[UInt8]) throws {
      for offset in stride(from:0,to:bytes.count,by:mtu) {
        var part=Array(bytes[offset..<min(offset+mtu,bytes.count)])
        let count=UInt16(part.count)
        let result=part.withUnsafeMutableBytes { channel.writeSync($0.baseAddress,length:count) }
        guard result == 0 else {
          throw NSError(domain:"MISES",code:Int(result),userInfo:[NSLocalizedDescriptionKey:"Envoi Bluetooth interrompu (\(result))"])
        }
        Thread.sleep(forTimeInterval:0.005)
      }
    }
    try write(first)
    Thread.sleep(forTimeInterval:0.18)
    try write(second)
    Thread.sleep(forTimeInterval:0.18)
    try write(raster)
  }
}

// Restricted loopback print endpoint: no remote host, no filesystem, no public server.
// Only MISES' published origins may send print jobs. It never invokes macOS print().
final class MisesPrintServer {
  private let listener: NWListener
  private let onPrint: (String, Data)->Void
  init(onPrint: @escaping (String,Data)->Void) throws {
    self.onPrint=onPrint
    let params=NWParameters.tcp
    let port=NWEndpoint.Port(rawValue:listenPort)!
    params.requiredLocalEndpoint = .hostPort(host:"127.0.0.1",port:port)
    listener=try NWListener(using:params)
    listener.newConnectionHandler={ [weak self] connection in self?.serve(connection) }
    listener.start(queue:DispatchQueue(label:"mises.printer.loopback"))
  }
  private func serve(_ conn:NWConnection) {
    conn.start(queue:DispatchQueue.global(qos:.userInitiated))
    var buffer=Data()
    func receiveMore(){
      conn.receive(minimumIncompleteLength:1,maximumLength:65536) { [weak self] data,_,done,error in
        if let data { buffer.append(data) }
        if buffer.count>2_500_000 { self?.respond(conn,status:413,origin:nil,text:"Too large"); return }
        if let marker=buffer.range(of:Data("\r\n\r\n".utf8)) {
          let header=String(decoding:buffer[..<marker.lowerBound],as:UTF8.self)
          let lines=header.components(separatedBy:"\r\n")
          let length=lines.first(where:{$0.lowercased().hasPrefix("content-length:")})?.split(separator:":").last.flatMap{Int($0.trimmingCharacters(in:.whitespaces))} ?? 0
          if length>2_000_000 { self?.respond(conn,status:413,origin:nil,text:"Too large"); return }
          let body=buffer[marker.upperBound...]
          if body.count<length && !done && error == nil { receiveMore(); return }
          self?.handle(conn:conn,header:header,body:Data(body.prefix(length)))
        } else if !done && error == nil { receiveMore() } else { conn.cancel() }
      }
    }
    receiveMore()
  }
  private func handle(conn:NWConnection,header:String,body:Data) {
    let lines=header.components(separatedBy:"\r\n")
    guard let first=lines.first else {respond(conn,status:400,origin:nil,text:"Malformed");return}
    let origin=lines.first(where:{$0.lowercased().hasPrefix("origin:")})?.split(separator:":",maxSplits:1).last.map{ $0.trimmingCharacters(in:.whitespaces) }
    guard let origin, allowedOrigins.contains(origin) else {respond(conn,status:403,origin:nil,text:"Forbidden");return}
    if first.hasPrefix("OPTIONS ") { respond(conn,status:204,origin:origin,text:"");return }
    if first.hasPrefix("GET /health ") {
      respond(conn,status:200,origin:origin,text:"{\"ready\":true,\"backend\":\"mac-bluetooth\"}")
      return
    }
    guard first.hasPrefix("POST /print ") else {respond(conn,status:404,origin:origin,text:"Not found");return}
    guard let payload=try? JSONSerialization.jsonObject(with:body) as? [String:Any],
          let label=payload["label"] as? String,
          let png=payload["png"] as? String,
          png.hasPrefix("data:image/png;base64,"),
          let decoded=Data(base64Encoded:String(png.dropFirst("data:image/png;base64,".count))),
          decoded.count>0,decoded.count<2_000_000 else {
      respond(conn,status:400,origin:origin,text:"Invalid PNG");return
    }
    onPrint(String(label.prefix(80)),decoded)
    respond(conn,status:202,origin:origin,text:"{\"queued\":true}")
  }
  private func respond(_ conn:NWConnection,status:Int,origin:String?,text:String){
    let phrase=status==200 ? "OK" : status==202 ? "Accepted" : status==204 ? "No Content" : "Error"
    let content=Data(text.utf8)
    var headers="HTTP/1.1 \(status) \(phrase)\r\nContent-Length: \(content.count)\r\nConnection: close\r\nContent-Type: application/json; charset=utf-8\r\n"
    if let origin {
      headers+="Access-Control-Allow-Origin: \(origin)\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nAccess-Control-Allow-Private-Network: true\r\n"
    }
    headers+="\r\n"
    conn.send(content:Data(headers.utf8)+content,completion:.contentProcessed { _ in conn.cancel() })
  }
}

[executed on device: MacBook-Air-M4-de-Cdric.local (1efbc799-63fb-466d-a8da-56d587d10304)]