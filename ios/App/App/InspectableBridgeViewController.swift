import Capacitor
import UIKit
import WebKit

/// Subclase mínima para habilitar Safari Web Inspector del WKWebView en depuración (iOS 16.4+).
/// Sin efecto en builds Release (`#if DEBUG`).
final class InspectableBridgeViewController: CAPBridgeViewController {

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        return webView
    }
}
