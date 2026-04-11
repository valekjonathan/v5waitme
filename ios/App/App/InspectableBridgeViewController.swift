import Capacitor
import UIKit
import WebKit

/**
 * Bridge Capacitor + WKWebView.
 *
 * Safari (Mac/iOS) no aplica insets automáticos de UIKit sobre el documento. En app nativa, el
 * `UIScrollView` del WKWebView usa por defecto `contentInsetAdjustmentBehavior = .automatic`,
 * lo que suma safe area al scroll **además** de `env(safe-area-inset-*)` y `viewport-fit=cover`
 * en CSS — el layout central (flex, `--app-height`) puede colapsar o quedar “negro” solo en WKWebView.
 *
 * Desactivar el ajuste automático alinea el comportamiento con Safari y con la web app en navegador.
 */
final class InspectableBridgeViewController: CAPBridgeViewController {

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        return webView
    }
}
