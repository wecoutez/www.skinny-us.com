import SwiftUI
import WebKit

// The bundled web app is served under a stable custom origin (skinny://app/…)
// instead of raw file://. This keeps a normal web origin so relative links and
// cross-origin fetches to the Google backend behave the same as on the website.
private let kAppScheme = "skinny"
private let kAppHost   = "app"
private let kEntryURL  = URL(string: "\(kAppScheme)://\(kAppHost)/index.html")!

struct WebScreen: View {
    var body: some View {
        WebView()
            .background(Color(.systemBackground))
    }
}

struct WebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: kAppScheme)
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = true
        webView.backgroundColor = .white
        webView.scrollView.backgroundColor = .white

        // Native pull-to-refresh.
        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator,
                          action: #selector(Coordinator.handleRefresh(_:)),
                          for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        context.coordinator.webView = webView
        webView.load(URLRequest(url: kEntryURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            webView?.reload()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
        }

        // Keep in-app navigation inside the app; send real external links to Safari.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
            let scheme = url.scheme?.lowercased() ?? ""

            if scheme == kAppScheme {
                decisionHandler(.allow); return
            }
            if navigationAction.navigationType == .linkActivated,
               ["http", "https", "mailto", "tel"].contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel); return
            }
            decisionHandler(.allow)
        }

        // target="_blank" / window.open → open externally.
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}

// Serves files bundled with the app in response to skinny://app/<file> requests.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let requestURL = urlSchemeTask.request.url ?? kEntryURL
        var path = requestURL.path
        if path.hasPrefix("/") { path.removeFirst() }
        if path.isEmpty { path = "index.html" }

        // Files are bundled flat at the app root, so resolve by last component.
        let component = (path as NSString).lastPathComponent
        let name = (component as NSString).deletingPathExtension
        let ext  = (component as NSString).pathExtension

        guard
            let fileURL = Bundle.main.url(forResource: name,
                                          withExtension: ext.isEmpty ? nil : ext),
            let data = try? Data(contentsOf: fileURL)
        else {
            let resp = HTTPURLResponse(url: requestURL, statusCode: 404,
                                       httpVersion: "HTTP/1.1",
                                       headerFields: ["Access-Control-Allow-Origin": "*"])!
            urlSchemeTask.didReceive(resp)
            urlSchemeTask.didReceive(Data("Not found".utf8))
            urlSchemeTask.didFinish()
            return
        }

        let headers = [
            "Content-Type": Self.mimeType(for: ext),
            "Content-Length": String(data.count),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        ]
        let resp = HTTPURLResponse(url: requestURL, statusCode: 200,
                                   httpVersion: "HTTP/1.1", headerFields: headers)!
        urlSchemeTask.didReceive(resp)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs":   return "application/javascript; charset=utf-8"
        case "css":         return "text/css; charset=utf-8"
        case "json":        return "application/json; charset=utf-8"
        case "svg":         return "image/svg+xml"
        case "png":         return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif":         return "image/gif"
        case "webp":        return "image/webp"
        case "ico":         return "image/x-icon"
        case "woff":        return "font/woff"
        case "woff2":       return "font/woff2"
        case "ttf":         return "font/ttf"
        default:            return "application/octet-stream"
        }
    }
}
