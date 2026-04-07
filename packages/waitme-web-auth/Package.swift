// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WaitmeWebAuth",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "WaitmeWebAuth",
            targets: ["WaitmeWebAuthPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.0")
    ],
    targets: [
        .target(
            name: "WaitmeWebAuthPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/WaitmeWebAuthPlugin")
    ]
)
