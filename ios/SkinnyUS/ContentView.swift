import SwiftUI

struct ContentView: View {
    var body: some View {
        WebScreen()
            .ignoresSafeArea(edges: .bottom)   // let content reach the home indicator
            .background(Color(.systemBackground))
    }
}

#Preview {
    ContentView()
}
