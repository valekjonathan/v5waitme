import AuthenticationServices
import Capacitor
import UIKit

@objc(WaitmeWebAuthPlugin)
public class WaitmeWebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "WaitmeWebAuthPlugin"
    public let jsName = "WaitmeWebAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Must provide a valid url")
            return
        }
        guard let scheme = call.getString("callbackScheme"), !scheme.isEmpty else {
            call.reject("callbackScheme is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.authSession?.cancel()
            self.authSession = nil

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: scheme
            ) { [weak self] callbackURL, error in
                guard let self = self else { return }

                DispatchQueue.main.async {
                    self.authSession = nil

                    if let error = error {
                        let ns = error as NSError
                        if ns.domain == ASWebAuthenticationSessionErrorDomain,
                           ns.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                            call.reject("User canceled", "USER_CANCELED", nil)
                            return
                        }
                        call.reject(error.localizedDescription, "AUTH_ERROR", error)
                        return
                    }

                    guard let callbackURL = callbackURL else {
                        call.reject("No callback URL returned")
                        return
                    }

                    print("WAITME URL OPEN:", callbackURL.absoluteString)
                    call.resolve(["callbackUrl": callbackURL.absoluteString])
                }
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false

            self.authSession = session

            if !session.start() {
                self.authSession = nil
                call.reject("Unable to start ASWebAuthenticationSession")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            if let key = windowScene.windows.first(where: { $0.isKeyWindow }) {
                return key
            }
            if let first = windowScene.windows.first {
                return first
            }
        }
        preconditionFailure("WaitmeWebAuth: no UIWindow for ASWebAuthenticationSession")
    }
}
