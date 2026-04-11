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

    /// Alinea el scroll del WKWebView con Safari: sin insets automáticos de UIKit (ver comentario de clase).
    private func applyWaitmeWebViewScrollInsets(to webView: WKWebView) {
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
    }

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        let webView = super.webView(with: frame, configuration: configuration)
        applyWaitmeWebViewScrollInsets(to: webView)
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        return webView
    }

    /**
     * Tras rotación, teclado u otros pasos de layout, UIKit puede volver a ajustar `contentInset`.
     * Repetir aquí evita que el cambio “no se refleje” en app nativa frente a Safari.
     */
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let wv = webView {
            applyWaitmeWebViewScrollInsets(to: wv)
        }
    }
}
