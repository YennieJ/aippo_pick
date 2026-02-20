import Foundation
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {
    private let appGroupID = "group.com.itl.aippopick"

    @objc
    func updateWidgetData(_ data: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            reject("UPDATE_ERROR", "Cannot access App Group UserDefaults", nil)
            return
        }
        for i in 1...3 {
            if let name = data["row\(i)_name"] as? String { defaults.set(name, forKey: "row\(i)_name") }
            if let dday = data["row\(i)_dday"] as? String { defaults.set(dday, forKey: "row\(i)_dday") }
            if let price = data["row\(i)_price"] as? String { defaults.set(price, forKey: "row\(i)_price") }
            if let sec = data["row\(i)_securities"] as? String { defaults.set(sec, forKey: "row\(i)_securities") }
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
            result["row\(i)_name"] = defaults.string(forKey: "row\(i)_name") ?? ""
            result["row\(i)_dday"] = defaults.string(forKey: "row\(i)_dday") ?? ""
            result["row\(i)_price"] = defaults.string(forKey: "row\(i)_price") ?? ""
            result["row\(i)_securities"] = defaults.string(forKey: "row\(i)_securities") ?? ""
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