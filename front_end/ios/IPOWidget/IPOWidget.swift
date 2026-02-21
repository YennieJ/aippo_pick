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
    let appGroupID = "group.com.itl.aippopick"
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
        if days > 0 { ddayStr = "D-\(days)" }
        else if days == 0 { ddayStr = "D-Day" }
        else { ddayStr = "D+\(abs(days))" }

        return "\(nearest.type) \(ddayStr)"
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
            defaults.set(row.name, forKey: "row\(idx)_name")
            defaults.set(row.dday, forKey: "row\(idx)_dday")
            defaults.set(row.price, forKey: "row\(idx)_price")
            defaults.set(row.securities, forKey: "row\(idx)_securities")
        }
    }

    func readFromUserDefaults() -> IPOEntry? {
        guard let defaults = UserDefaults(suiteName: appGroupID) else { return nil }
        var rows: [IPORowData] = []
        for i in 1...3 {
            let name = defaults.string(forKey: "row\(i)_name") ?? ""
            if name.isEmpty { continue }
            rows.append(IPORowData(
                name: name,
                dday: defaults.string(forKey: "row\(i)_dday") ?? "-",
                price: defaults.string(forKey: "row\(i)_price") ?? "-",
                securities: defaults.string(forKey: "row\(i)_securities") ?? "-"
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
                ForEach(0..<entry.rows.count, id: \.self) { index in
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