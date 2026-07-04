import WidgetKit
import SwiftUI

// MARK: - Data Model

struct IPORowData {
    let name: String
    let dday: String      // 예: "청약 D-1", "환불 D-3", "상장 D-5", "-"
    let price: String     // 예: "32,000원", "-"
    let securities: String
}

struct IPOEntry: TimelineEntry {
    let date: Date
    let rows: [IPORowData]
    let isLoading: Bool
}

// 최대 표시 종목 수 (large 기준). medium은 뷰에서 3개로 자름.
private let maxRowCount = 6

// MARK: - Timeline Provider

struct IPOProvider: TimelineProvider {
    let appGroupID = "group.com.itl.aippopick"
    let apiURL = "https://api.aippopick.shop/data_ipo/today"

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
            for item in jsonArray.prefix(maxRowCount) {
                let title = item["title"] as? String ?? "데이터 없음"
                let status = item["status"] as? String ?? ""
                let subRaw = item["subscriptiondate"] as? String ?? ""
                let refundDate = item["refunddate"] as? String ?? ""
                let listingDate = item["listingdate"] as? String ?? ""
                let dday = ddayByStatus(status: status, subscription: subRaw, refund: refundDate, listing: listingDate)
                let confirmedPrice = item["confirmedprice"] as? String ?? "-"
                let price = (confirmedPrice.isEmpty || confirmedPrice == "-원") ? "-" : confirmedPrice
                let brokers = item["brokers"] as? [String] ?? []
                let securities = brokers.isEmpty ? "-" : brokers.joined(separator: ", ")
                rows.append(IPORowData(name: title, dday: dday, price: price, securities: securities))
            }

            completion(.success(rows))
        }.resume()
    }

    // MARK: - D-Day Calculation

    /// 청약일 범위(시작~종료)일 때, 시작일이 지나면 종료일 기준으로 D-day
    func extractStartDate(_ dateRange: String) -> String {
        if dateRange.isEmpty { return "" }
        let trimmed = dateRange.trimmingCharacters(in: .whitespaces)
        if trimmed.contains("~") {
            let parts = trimmed.components(separatedBy: "~").map { $0.trimmingCharacters(in: .whitespaces) }
            guard parts.count >= 2, let startDate = parseDate(parts[0]) else { return parts.first ?? "" }
            let today = Calendar.current.startOfDay(for: Date())
            if today >= startDate { return parts[1] }
            return parts[0]
        }
        return trimmed
    }

    /// 상세(날짜 3종) 기준으로 통일: status는 신뢰하지 않고 날짜로 상태를 추론해 D-day 표기
    func ddayByStatus(status: String, subscription: String, refund: String, listing: String) -> String {
        // status 파라미터는 API 호환을 위해 유지하지만, 실제 표시는 날짜 기반 추론을 사용
        return calculateNearestDday(subscription: extractStartDate(subscription), refund: refund, listing: listing)
    }

    func calculateNearestDday(subscription: String, refund: String, listing: String) -> String {
        let today = Calendar.current.startOfDay(for: Date())

        struct DateInfo {
            let date: Date
            let status: String
        }

        var candidates: [DateInfo] = []
        if let d = parseDate(subscription), d >= today { candidates.append(DateInfo(date: d, status: "청약")) }
        if let d = parseDate(refund), d >= today { candidates.append(DateInfo(date: d, status: "환불")) }
        if let d = parseDate(listing), d >= today { candidates.append(DateInfo(date: d, status: "상장")) }

        guard let nearest = candidates.min(by: { $0.date < $1.date }) else { return "-" }

        let days = Calendar.current.dateComponents([.day], from: today, to: Calendar.current.startOfDay(for: nearest.date)).day ?? 0
        let ddayText = formatAppDday(days)
        if ddayText == "-" { return "-" }
        return "\(nearest.status) \(ddayText)"
    }

    /// 앱과 동일 규칙의 D-day 텍스트
    /// - 과거: "-"
    /// - 오늘: "D-Day"
    /// - 미래: "D-N"
    func formatAppDday(_ days: Int) -> String {
        if days < 0 { return "-" }
        if days == 0 { return "D-Day" }
        return "D-\(days)"
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
        // 이전 데이터 정리 후 저장 (종목 수가 줄어든 경우 잔존 방지)
        for i in 1...maxRowCount {
            defaults.removeObject(forKey: "row\(i)_name")
            defaults.removeObject(forKey: "row\(i)_dday")
            defaults.removeObject(forKey: "row\(i)_price")
            defaults.removeObject(forKey: "row\(i)_securities")
        }
        for (i, row) in rows.prefix(maxRowCount).enumerated() {
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
        for i in 1...maxRowCount {
            let name = defaults.string(forKey: "row\(i)_name") ?? ""
            if name.isEmpty || name == "데이터 없음" { continue }
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
            IPORowData(name: "한빛로보틱스", dday: "청약 D-1", price: "32,000원", securities: "NH투자증권"),
            IPORowData(name: "세종에너지", dday: "환불 D-3", price: "45,000원", securities: "미래에셋증권"),
            IPORowData(name: "대성그린에너지", dday: "상장 D-5", price: "-", securities: "한국투자증권"),
            IPORowData(name: "미래반도체", dday: "청약 D-7", price: "28,500원", securities: "키움증권"),
            IPORowData(name: "엔바이오", dday: "청약 D-9", price: "12,000원", securities: "삼성증권"),
            IPORowData(name: "케이팜스", dday: "환불 D-12", price: "9,800원", securities: "신한투자증권"),
        ]
    }
}

// MARK: - SwiftUI Views

struct IPOWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: IPOProvider.Entry

    /// medium은 3개, large는 6개
    private var rowCount: Int { family == .systemLarge ? 6 : 3 }

    // 헤더 앱 로고 (위젯 번들에 에셋 카탈로그가 없어 base64로 임베드)
    private static let appLogoBase64 = "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"
    private static let appLogo: UIImage? = {
        guard let data = Data(base64Encoded: appLogoBase64) else { return nil }
        return UIImage(data: data)
    }()

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content
                .containerBackground(.fill.tertiary, for: .widget)
        } else {
            content
                .padding(14)
                .background(Color(UIColor.systemBackground))
        }
    }

    private var visibleRows: [IPORowData] {
        Array(entry.rows.prefix(rowCount))
    }

    var content: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 6) {
                if let logo = Self.appLogo {
                    Image(uiImage: logo)
                        .resizable()
                        .frame(width: 18, height: 18)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                Text("오늘의 공모주")
                    .font(.system(size: 16, weight: .bold))
                Spacer()
                if !entry.isLoading && !visibleRows.isEmpty {
                    Text("\(visibleRows.count)건")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.bottom, 8)

            if entry.isLoading || visibleRows.isEmpty {
                Spacer()
                Text("오늘 공모 일정이 없어요")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                ForEach(Array(visibleRows.enumerated()), id: \.offset) { index, row in
                    rowView(row)
                    if index < visibleRows.count - 1 {
                        Divider().opacity(0.5)
                    }
                }
            }
        }
    }

    // 행: 좌측(종목명 + 공모가·증권사) / 우측(D-Day 컬러 뱃지)
    private func rowView(_ row: IPORowData) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(row.name)
                    .font(.system(size: 15, weight: .bold))
                    .lineLimit(1)
                Text(metaText(row))
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            ddayBadge(row.dday)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // A안: 공모가 없으면 "공모가 미정"
    private func metaText(_ row: IPORowData) -> String {
        let priceText = (row.price.isEmpty || row.price == "-") ? "공모가 미정" : row.price
        if row.securities.isEmpty || row.securities == "-" {
            return priceText
        }
        return "\(priceText) · \(row.securities)"
    }

    @ViewBuilder
    // 아웃라인 스타일: 카드색 배경 + 상태별 hue 테두리/글자 (달력과 통일)
    private func ddayBadge(_ dday: String) -> some View {
        let status = dday.components(separatedBy: " ").first ?? ""
        let hue = badgeHue(status)
        return Text(dday)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(hue)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                Capsule()
                    .fill(Color(UIColor.systemBackground))
                    .overlay(Capsule().stroke(hue, lineWidth: 1.5))
            )
    }

    private func badgeHue(_ status: String) -> Color {
        switch status {
        case "청약": return Color(red: 0x5B / 255, green: 0x9F / 255, blue: 0xFF / 255)
        case "환불": return Color(red: 0x34 / 255, green: 0xD3 / 255, blue: 0x99 / 255)
        case "상장": return Color(red: 0xF8 / 255, green: 0x71 / 255, blue: 0x71 / 255)
        default:    return Color.gray
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
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
