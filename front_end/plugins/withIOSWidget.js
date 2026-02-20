const {
    withEntitlementsPlist,
    withDangerousMod,
    withXcodeProject,
    withInfoPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_NAME = "IPOWidget";
const WIDGET_BUNDLE_ID = "com.itl.aippopick.widget";
const APP_GROUP_ID = "group.com.itl.aippopick";

// ─── Swift 소스 코드 ──────────────────────────────────────────

const WIDGET_SWIFT = `
import WidgetKit
import SwiftUI

// MARK: - Data Model

struct IPORowData {
    let name: String
    let dday: String
    let price: String
    let securities: String
}

struct IPOEntry: TimelineEntry {
    let date: Date
    let rows: [IPORowData]
    let isLoading: Bool
}

// MARK: - Timeline Provider

struct IPOProvider: TimelineProvider {
    let appGroupID = "${APP_GROUP_ID}"
    // 개발: HTTP IP, 프로덕션: HTTPS 도메인
    #if DEBUG
    let apiURL = "http://122.42.248.81:4000/data_ipo/today"
    #else
    let apiURL = "https://api.aippopick.shop/data_ipo/today"
    #endif

    func placeholder(in context: Context) -> IPOEntry {
        IPOEntry(date: Date(), rows: sampleRows(), isLoading: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (IPOEntry) -> Void) {
        if let cached = readFromUserDefaults() {
            completion(cached)
        } else {
            completion(IPOEntry(date: Date(), rows: sampleRows(), isLoading: false))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<IPOEntry>) -> Void) {
        fetchIPOData { result in
            let entry: IPOEntry
            switch result {
            case .success(let rows):
                entry = IPOEntry(date: Date(), rows: rows, isLoading: false)
                saveToUserDefaults(rows: rows)
            case .failure:
                entry = readFromUserDefaults() ?? IPOEntry(date: Date(), rows: [], isLoading: true)
            }
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    // MARK: - API Fetch

    func fetchIPOData(completion: @escaping (Result<[IPORowData], Error>) -> Void) {
        guard let url = URL(string: apiURL) else {
            completion(.failure(NSError(domain: "IPOWidget", code: -1)))
            return
        }

        URLSession.shared.dataTask(with: url) { data, _, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let data = data,
                  let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                completion(.failure(NSError(domain: "IPOWidget", code: -2)))
                return
            }

            var rows: [IPORowData] = []
            for item in jsonArray.prefix(3) {
                let title = item["title"] as? String ?? "데이터 없음"
                let subDate = extractStartDate(item["subscriptiondate"] as? String ?? "")
                let refundDate = item["refunddate"] as? String ?? ""
                let listingDate = item["listingdate"] as? String ?? ""
                let dday = calculateNearestDday(subscription: subDate, refund: refundDate, listing: listingDate)
                let confirmedPrice = item["confirmedprice"] as? String ?? "-"
                let price = (confirmedPrice.isEmpty || confirmedPrice == "-원") ? "-" : confirmedPrice
                let brokers = item["brokers"] as? [String] ?? []
                let securities = brokers.isEmpty ? "-" : brokers.joined(separator: ", ")
                rows.append(IPORowData(name: title, dday: dday, price: price, securities: securities))
            }

            while rows.count < 3 {
                rows.append(IPORowData(name: "데이터 없음", dday: "-", price: "-", securities: "-"))
            }
            completion(.success(rows))
        }.resume()
    }

    // MARK: - D-Day Calculation

    func extractStartDate(_ dateRange: String) -> String {
        if dateRange.isEmpty { return "" }
        if dateRange.contains("~") {
            return dateRange.components(separatedBy: "~").first?.trimmingCharacters(in: .whitespaces) ?? ""
        }
        return dateRange.trimmingCharacters(in: .whitespaces)
    }

    func calculateNearestDday(subscription: String, refund: String, listing: String) -> String {
        let today = Calendar.current.startOfDay(for: Date())

        struct DateInfo {
            let date: Date
            let type: String
        }

        var candidates: [DateInfo] = []
        if let d = parseDate(subscription), d >= today { candidates.append(DateInfo(date: d, type: "청약")) }
        if let d = parseDate(refund), d >= today { candidates.append(DateInfo(date: d, type: "환불")) }
        if let d = parseDate(listing), d >= today { candidates.append(DateInfo(date: d, type: "상장")) }

        guard let nearest = candidates.min(by: { $0.date < $1.date }) else { return "-" }

        let days = Calendar.current.dateComponents([.day], from: today, to: Calendar.current.startOfDay(for: nearest.date)).day ?? 0
        let ddayStr: String
        if days > 0 { ddayStr = "D-\\(days)" }
        else if days == 0 { ddayStr = "D-Day" }
        else { ddayStr = "D+\\(abs(days))" }

        return "\\(nearest.type) \\(ddayStr)"
    }

    func parseDate(_ str: String) -> Date? {
        if str.isEmpty { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        for fmt in ["yyyy-MM-dd", "yyyy.MM.dd", "yyyy/MM/dd"] {
            formatter.dateFormat = fmt
            if let d = formatter.date(from: str) { return d }
        }
        return nil
    }

    // MARK: - UserDefaults

    func saveToUserDefaults(rows: [IPORowData]) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return }
        for (i, row) in rows.prefix(3).enumerated() {
            let idx = i + 1
            defaults.set(row.name, forKey: "row\\(idx)_name")
            defaults.set(row.dday, forKey: "row\\(idx)_dday")
            defaults.set(row.price, forKey: "row\\(idx)_price")
            defaults.set(row.securities, forKey: "row\\(idx)_securities")
        }
    }

    func readFromUserDefaults() -> IPOEntry? {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return nil }
        var rows: [IPORowData] = []
        for i in 1...3 {
            let name = defaults.string(forKey: "row\\(i)_name") ?? ""
            if name.isEmpty { continue }
            rows.append(IPORowData(
                name: name,
                dday: defaults.string(forKey: "row\\(i)_dday") ?? "-",
                price: defaults.string(forKey: "row\\(i)_price") ?? "-",
                securities: defaults.string(forKey: "row\\(i)_securities") ?? "-"
            ))
        }
        if rows.isEmpty { return nil }
        return IPOEntry(date: Date(), rows: rows, isLoading: false)
    }

    func sampleRows() -> [IPORowData] {
        return [
            IPORowData(name: "샘플 종목", dday: "청약 D-3", price: "10,000원", securities: "NH투자증권"),
            IPORowData(name: "데이터 없음", dday: "-", price: "-", securities: "-"),
            IPORowData(name: "데이터 없음", dday: "-", price: "-", securities: "-"),
        ]
    }
}

// MARK: - SwiftUI Views

struct IPOWidgetEntryView: View {
    var entry: IPOProvider.Entry

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content
                .containerBackground(.fill.tertiary, for: .widget)
        } else {
            content
                .padding(12)
                .background(Color(UIColor.systemBackground))
        }
    }

    var content: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("오늘의 공모주")
                .font(.system(size: 16, weight: .bold))
                .padding(.bottom, 6)

            // Header
            HStack(spacing: 0) {
                Text("종목명")
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("D-Day")
                    .frame(width: 76, alignment: .leading)
                Text("공모가")
                    .frame(width: 62, alignment: .leading)
                Text("증권사")
                    .frame(width: 62, alignment: .leading)
            }
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.secondary)
            .padding(.vertical, 6)
            .padding(.horizontal, 6)
            .background(Color.gray.opacity(0.12))
            .cornerRadius(4)

            if entry.isLoading || entry.rows.isEmpty {
                Spacer()
                Text("데이터 로딩 중...")
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                ForEach(0..<entry.rows.count, id: \\.self) { index in
                    HStack(spacing: 0) {
                        Text(entry.rows[index].name)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .lineLimit(1)
                        Text(entry.rows[index].dday)
                            .frame(width: 76, alignment: .leading)
                            .lineLimit(1)
                        Text(entry.rows[index].price)
                            .frame(width: 62, alignment: .leading)
                            .lineLimit(1)
                        Text(entry.rows[index].securities)
                            .frame(width: 62, alignment: .leading)
                            .lineLimit(1)
                    }
                    .font(.system(size: 13))
                    .frame(maxHeight: .infinity)
                    .padding(.horizontal, 6)
                }
            }
        }
    }
}

struct IPOWidget: Widget {
    let kind: String = "IPOWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: IPOProvider()) { entry in
            IPOWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("오늘의 공모주")
        .description("오늘의 공모주 일정을 확인하세요")
        .supportedFamilies([.systemMedium])
    }
}
`;

const WIDGET_BUNDLE_SWIFT = `
import WidgetKit
import SwiftUI

@main
struct IPOWidgetBundle: WidgetBundle {
    var body: some Widget {
        IPOWidget()
    }
}
`;

const WIDGET_MODULE_SWIFT = `
import Foundation
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {
    private let appGroupID = "${APP_GROUP_ID}"

    @objc
    func updateWidgetData(_ data: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            reject("UPDATE_ERROR", "Cannot access App Group UserDefaults", nil)
            return
        }
        for i in 1...3 {
            if let name = data["row\\(i)_name"] as? String { defaults.set(name, forKey: "row\\(i)_name") }
            if let dday = data["row\\(i)_dday"] as? String { defaults.set(dday, forKey: "row\\(i)_dday") }
            if let price = data["row\\(i)_price"] as? String { defaults.set(price, forKey: "row\\(i)_price") }
            if let sec = data["row\\(i)_securities"] as? String { defaults.set(sec, forKey: "row\\(i)_securities") }
        }
        defaults.synchronize()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        resolve("Widget updated")
    }

    @objc
    func getWidgetData(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            reject("GET_ERROR", "Cannot access App Group UserDefaults", nil)
            return
        }
        var result: [String: String] = [:]
        for i in 1...3 {
            result["row\\(i)_name"] = defaults.string(forKey: "row\\(i)_name") ?? ""
            result["row\\(i)_dday"] = defaults.string(forKey: "row\\(i)_dday") ?? ""
            result["row\\(i)_price"] = defaults.string(forKey: "row\\(i)_price") ?? ""
            result["row\\(i)_securities"] = defaults.string(forKey: "row\\(i)_securities") ?? ""
        }
        resolve(result)
    }

    @objc
    func forceRefreshWidget(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            resolve("Widget refreshed")
        } else {
            resolve("Widgets not supported on this iOS version")
        }
    }

    @objc static func requiresMainQueueSetup() -> Bool { return false }
}
`;

const WIDGET_MODULE_M = `
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(updateWidgetData:(NSDictionary *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getWidgetData:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(forceRefreshWidget:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
`;

// ─── Plugin Implementation ────────────────────────────────────

function withIOSWidget(config) {
    // 1. Add App Groups entitlement to main app
    config = withEntitlementsPlist(config, (config) => {
        config.modResults["com.apple.security.application-groups"] = [APP_GROUP_ID];
        return config;
    });

    // 2. Add ATS to Info.plist (already done in app.config.js, but ensure it's there)
    config = withInfoPlist(config, (config) => {
        config.modResults.NSAppTransportSecurity = {
            NSAllowsArbitraryLoads: true,
        };
        return config;
    });

    // 3. Write widget extension files and native module
    config = withDangerousMod(config, [
        "ios",
        async (config) => {
            const iosPath = config.modRequest.platformProjectRoot;
            const projectName = config.modRequest.projectName;

            // Write widget extension files
            const widgetDir = path.join(iosPath, WIDGET_NAME);
            fs.mkdirSync(widgetDir, { recursive: true });

            fs.writeFileSync(
                path.join(widgetDir, "IPOWidget.swift"),
                WIDGET_SWIFT.trim()
            );
            fs.writeFileSync(
                path.join(widgetDir, "IPOWidgetBundle.swift"),
                WIDGET_BUNDLE_SWIFT.trim()
            );

            // Widget entitlements
            const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP_ID}</string>
    </array>
</dict>
</plist>`;
            fs.writeFileSync(
                path.join(widgetDir, `${WIDGET_NAME}.entitlements`),
                widgetEntitlements
            );

            // Widget Info.plist
            const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>오늘의 공모주</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>`;
            fs.writeFileSync(path.join(widgetDir, "Info.plist"), widgetInfoPlist);

            // Write native module files into the main app target
            const appDir = path.join(iosPath, projectName);
            fs.writeFileSync(
                path.join(appDir, "WidgetModule.swift"),
                WIDGET_MODULE_SWIFT.trim()
            );
            fs.writeFileSync(
                path.join(appDir, "WidgetModule.m"),
                WIDGET_MODULE_M.trim()
            );

            return config;
        },
    ]);

    // 4. Modify Xcode project to add widget extension target
    config = withXcodeProject(config, (config) => {
        const xcodeProject = config.modResults;
        const projectName = config.modRequest.projectName;

        // Check if widget target already exists
        const existingTarget = xcodeProject.pbxTargetByName(WIDGET_NAME);
        if (existingTarget) {
            return config;
        }

        // Add widget target
        const widgetTarget = xcodeProject.addTarget(
            WIDGET_NAME,
            "app_extension",
            WIDGET_NAME,
            WIDGET_BUNDLE_ID
        );

        // Add widget group
        const widgetGroupKey = xcodeProject.addPbxGroup(
            [
                "IPOWidget.swift",
                "IPOWidgetBundle.swift",
                "Info.plist",
                `${WIDGET_NAME}.entitlements`,
            ],
            WIDGET_NAME,
            WIDGET_NAME
        );

        // Add group to main group
        const mainGroupId = xcodeProject.getFirstProject().firstProject.mainGroup;
        xcodeProject.addToPbxGroup(widgetGroupKey.uuid, mainGroupId);

        // Add source files to widget target build phase
        xcodeProject.addBuildPhase(
            ["IPOWidget.swift", "IPOWidgetBundle.swift"],
            "PBXSourcesBuildPhase",
            "Sources",
            widgetTarget.uuid
        );

        // Add frameworks
        xcodeProject.addBuildPhase(
            [],
            "PBXFrameworksBuildPhase",
            "Frameworks",
            widgetTarget.uuid
        );

        // Add WidgetKit and SwiftUI frameworks
        xcodeProject.addFramework("WidgetKit.framework", {
            target: widgetTarget.uuid,
            link: true,
        });
        xcodeProject.addFramework("SwiftUI.framework", {
            target: widgetTarget.uuid,
            link: true,
        });

        // Set build settings for widget target
        const configurations = xcodeProject.pbxXCBuildConfigurationSection();
        for (const key in configurations) {
            if (
                typeof configurations[key] === "object" &&
                configurations[key].buildSettings
            ) {
                const bs = configurations[key].buildSettings;
                // Find configs belonging to the widget target
                if (bs.PRODUCT_BUNDLE_IDENTIFIER === `"${WIDGET_BUNDLE_ID}"` ||
                    bs.PRODUCT_NAME === `"${WIDGET_NAME}"`) {
                    bs.SWIFT_VERSION = "5.0";
                    bs.IPHONEOS_DEPLOYMENT_TARGET = "15.1";
                    bs.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_NAME}/${WIDGET_NAME}.entitlements"`;
                    bs.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
                    bs.TARGETED_DEVICE_FAMILY = `"1,2"`;
                    bs.GENERATE_INFOPLIST_FILE = "YES";
                    bs.CURRENT_PROJECT_VERSION = "1";
                    bs.MARKETING_VERSION = "1.0.0";
                    bs.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = "WidgetBackground";
                    bs.PRODUCT_BUNDLE_IDENTIFIER = `"${WIDGET_BUNDLE_ID}"`;
                    bs.SKIP_INSTALL = "YES";
                }
            }
        }

        // Embed widget extension in the main app
        const mainTarget = xcodeProject.getFirstTarget();
        xcodeProject.addBuildPhase(
            [],
            "PBXCopyFilesBuildPhase",
            "Embed Foundation Extensions",
            mainTarget.uuid,
            "app_extension"
        );

        return config;
    });

    return config;
}

module.exports = withIOSWidget;
