"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { searchCmtEntities, type SearchMatch } from "./searchLogic";

type View = "home" | "share" | "search" | "turns" | "entity";

type Entity = {
  entity_id: string;
  entity_name: string;
  address: string;
  location: string;
  contact: string;
  categories_seen: string[];
  items_seen: string[];
  good_points: string[];
  created_at: string;
  updated_at: string;
};

type Signal = {
  signal_id: string;
  entity_id: string;
  raw_text: string;
  category: string;
  item_mentioned: string;
  good_points: string[];
  source_type: "PHOTO" | "MANUAL";
  photo: string;
  created_at: string;
  contributor: string;
};

type PhotoObservation = {
  photo_id: string;
  signal_id: string;
  ocr_text: string;
  detected_business_name: string;
  detected_address: string;
  detected_business_type: string;
  confidence: number;
  user_confirmed: boolean;
};

const seedEntities: Entity[] = [
  {
    entity_id: "entity_001",
    entity_name: "Phở Gốc Đa",
    address: "18 Lạch Tray, Ngô Quyền, Hải Phòng",
    location: "Hải Phòng",
    contact: "",
    categories_seen: ["Ăn uống"],
    items_seen: ["Phở bò", "Quẩy"],
    good_points: ["Nước dùng trong", "Thịt mềm", "Phục vụ nhanh"],
    created_at: "2026-07-02T08:15:00Z",
    updated_at: "2026-07-14T07:30:00Z",
  },
  {
    entity_id: "entity_002",
    entity_name: "Mây Cafe",
    address: "82 Trần Thái Tông, Cầu Giấy, Hà Nội",
    location: "Cầu Giấy, Hà Nội",
    contact: "",
    categories_seen: ["Cafe", "Không gian"],
    items_seen: ["Cafe sữa", "Trà đào"],
    good_points: ["Yên tĩnh", "Ghế ngồi thoải mái", "Nhân viên dễ chịu"],
    created_at: "2026-07-04T09:00:00Z",
    updated_at: "2026-07-12T10:10:00Z",
  },
  {
    entity_id: "entity_003",
    entity_name: "An Tâm Điện Lạnh",
    address: "45 Lê Hoàn, TP Thanh Hóa, Thanh Hóa",
    location: "Thanh Hóa",
    contact: "0912 345 678",
    categories_seen: ["Sửa chữa", "Điện lạnh"],
    items_seen: ["Điều hòa", "Tủ lạnh"],
    good_points: ["Báo giá trước", "Làm cẩn thận", "Đúng hẹn"],
    created_at: "2026-06-28T13:20:00Z",
    updated_at: "2026-07-10T15:40:00Z",
  },
  {
    entity_id: "entity_004",
    entity_name: "Linh Makeup Studio",
    address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    location: "Thanh Xuân, Hà Nội",
    contact: "",
    categories_seen: ["Làm đẹp", "Makeup", "Chụp ảnh"],
    items_seen: ["Makeup tự nhiên", "Trang điểm cô dâu"],
    good_points: ["Lớp nền tự nhiên", "Lên ảnh đẹp", "Tư vấn kỹ"],
    created_at: "2026-07-06T12:00:00Z",
    updated_at: "2026-07-13T08:05:00Z",
  },
];

const seedSignals: Signal[] = [
  { signal_id: "signal_001", entity_id: "entity_001", raw_text: "Phở bò ngon, nước dùng trong, thịt mềm và ra món nhanh.", category: "Ăn uống", item_mentioned: "Phở bò", good_points: ["Nước dùng trong", "Thịt mềm", "Phục vụ nhanh"], source_type: "PHOTO", photo: "", created_at: "2026-07-14T07:30:00Z", contributor: "Một người trong cộng đồng" },
  { signal_id: "signal_002", entity_id: "entity_001", raw_text: "Quẩy giòn, quán sạch và cô chủ rất niềm nở.", category: "Ăn uống", item_mentioned: "Quẩy", good_points: ["Quẩy giòn", "Quán sạch", "Niềm nở"], source_type: "PHOTO", photo: "", created_at: "2026-07-08T06:45:00Z", contributor: "Một người trong cộng đồng" },
  { signal_id: "signal_003", entity_id: "entity_002", raw_text: "Cafe yên tĩnh, ghế ngồi thoải mái, hợp ngồi làm việc buổi sáng.", category: "Cafe", item_mentioned: "Cafe sữa", good_points: ["Yên tĩnh", "Thoải mái"], source_type: "PHOTO", photo: "", created_at: "2026-07-12T10:10:00Z", contributor: "Một người trong cộng đồng" },
  { signal_id: "signal_004", entity_id: "entity_003", raw_text: "Thợ sửa điều hòa cẩn thận, báo giá trước rồi mới làm.", category: "Điện lạnh", item_mentioned: "Sửa điều hòa", good_points: ["Báo giá trước", "Cẩn thận"], source_type: "PHOTO", photo: "", created_at: "2026-07-10T15:40:00Z", contributor: "Một người trong cộng đồng" },
  { signal_id: "signal_005", entity_id: "entity_004", raw_text: "Makeup tự nhiên, chụp ảnh lên rất đẹp và tư vấn màu hợp da.", category: "Makeup", item_mentioned: "Makeup tự nhiên", good_points: ["Tự nhiên", "Lên ảnh đẹp", "Tư vấn kỹ"], source_type: "PHOTO", photo: "", created_at: "2026-07-13T08:05:00Z", contributor: "Một người trong cộng đồng" },
];

const normalize = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function Icon({ name }: { name: "home" | "share" | "search" | "turns" | "camera" | "pin" | "check" | "back" | "spark" | "route" | "edit" }) {
  const icons: Record<string, string> = { home: "⌂", share: "+", search: "⌕", turns: "↻", camera: "▣", pin: "●", check: "✓", back: "←", spark: "✦", route: "↗", edit: "✎" };
  return <span className={`icon icon-${name}`} aria-hidden="true">{icons[name]}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [shareStep, setShareStep] = useState(1);
  const [entities, setEntities] = useState<Entity[]>(seedEntities);
  const [signals, setSignals] = useState<Signal[]>(seedSignals);
  const [observations, setObservations] = useState<PhotoObservation[]>([]);
  const [userSignalIds, setUserSignalIds] = useState<string[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("entity_001");
  const [photoUrl, setPhotoUrl] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [sourceType, setSourceType] = useState<"PHOTO" | "MANUAL">("PHOTO");
  const [analyzing, setAnalyzing] = useState(false);
  const [extractReady, setExtractReady] = useState(false);
  const [entityName, setEntityName] = useState("Linh Makeup Studio");
  const [address, setAddress] = useState("123 Nguyễn Trãi, Thanh Xuân, Hà Nội");
  const [businessType, setBusinessType] = useState("Makeup / làm đẹp");
  const [rawText, setRawText] = useState("");
  const [savedSignalId, setSavedSignalId] = useState("");
  const [query, setQuery] = useState("");
  const [searchRan, setSearchRan] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tiktak-cmt-prototype");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.entities)) setEntities(parsed.entities);
      if (Array.isArray(parsed.signals)) setSignals(parsed.signals);
      if (Array.isArray(parsed.observations)) setObservations(parsed.observations);
      if (Array.isArray(parsed.userSignalIds)) setUserSignalIds(parsed.userSignalIds);
    } catch { /* Prototype continues with seed data. */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("tiktak-cmt-prototype", JSON.stringify({ entities, signals, observations, userSignalIds })); } catch { /* Ignore local quota in prototype. */ }
  }, [entities, signals, observations, userSignalIds]);

  const derived = useMemo(() => {
    const text = normalize(rawText);
    let category = businessType.includes("Makeup") ? "Makeup" : businessType.includes("Ăn") ? "Ăn uống" : "Trải nghiệm tốt";
    let item = businessType.includes("Makeup") ? "Makeup tự nhiên" : "Dịch vụ được nhắc đến";
    const points: string[] = [];
    if (text.includes("tu nhien")) points.push("Tự nhiên");
    if (text.includes("dep")) points.push("Lên ảnh đẹp");
    if (text.includes("nhanh")) points.push("Nhanh");
    if (text.includes("can than")) points.push("Cẩn thận");
    if (text.includes("bao gia")) points.push("Báo giá trước");
    if (text.includes("ngon")) { category = "Ăn uống"; item = text.includes("pho") ? "Phở" : "Món ăn"; points.push("Ngon"); }
    if (text.includes("yen tinh")) { category = "Cafe"; item = "Không gian cafe"; points.push("Yên tĩnh"); }
    if (!points.length && rawText.trim()) points.push("Điều tốt được người dùng ghi nhận");
    return { category, item, points };
  }, [rawText, businessType]);

  const selectedEntity = entities.find((item) => item.entity_id === selectedEntityId) ?? entities[0];
  const selectedSignals = signals.filter((item) => item.entity_id === selectedEntity?.entity_id);
  const contributionCount = userSignalIds.length;
  const turns = 10 + contributionCount * 10;

  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetShare = () => {
    setShareStep(1); setPhotoUrl(""); setHasPhoto(false); setSourceType("PHOTO"); setAnalyzing(false); setExtractReady(false);
    setEntityName("Linh Makeup Studio"); setAddress("123 Nguyễn Trãi, Thanh Xuân, Hà Nội"); setBusinessType("Makeup / làm đẹp"); setRawText(""); setSavedSignalId("");
  };
  const startShare = () => { resetShare(); go("share"); };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhotoUrl(String(reader.result || "")); setHasPhoto(true); setSourceType("PHOTO"); };
    reader.readAsDataURL(file);
  };

  const useDemoPhoto = () => { setPhotoUrl(""); setHasPhoto(true); setSourceType("PHOTO"); };
  const runExtraction = () => {
    setAnalyzing(true); setExtractReady(false);
    window.setTimeout(() => { setAnalyzing(false); setExtractReady(true); setShareStep(2); }, 1100);
  };
  const useManual = () => { setSourceType("MANUAL"); setHasPhoto(false); setExtractReady(true); setEntityName(""); setAddress(""); setBusinessType(""); setShareStep(2); };

  const saveExperience = () => {
    const now = new Date().toISOString();
    const exactMatch = entities.find((item) => normalize(item.entity_name) === normalize(entityName) && normalize(item.address) === normalize(address));
    const entityId = exactMatch?.entity_id ?? uid("entity");
    const signalId = uid("signal");
    const signal: Signal = { signal_id: signalId, entity_id: entityId, raw_text: rawText.trim(), category: derived.category, item_mentioned: derived.item, good_points: derived.points, source_type: sourceType, photo: hasPhoto ? "photo-captured" : "", created_at: now, contributor: "Bạn" };
    if (exactMatch) {
      setEntities((current) => current.map((item) => item.entity_id !== entityId ? item : { ...item, categories_seen: Array.from(new Set([...item.categories_seen, derived.category])), items_seen: Array.from(new Set([...item.items_seen, derived.item])), good_points: Array.from(new Set([...item.good_points, ...derived.points])), updated_at: now }));
    } else {
      setEntities((current) => [...current, { entity_id: entityId, entity_name: entityName.trim(), address: address.trim(), location: address.trim(), contact: "", categories_seen: [derived.category], items_seen: [derived.item], good_points: derived.points, created_at: now, updated_at: now }]);
    }
    setSignals((current) => [signal, ...current]);
    if (sourceType === "PHOTO") setObservations((current) => [{ photo_id: uid("photo"), signal_id: signalId, ocr_text: `${entityName}\n${address}\n${businessType}`, detected_business_name: entityName, detected_address: address, detected_business_type: businessType, confidence: .93, user_confirmed: true }, ...current]);
    setUserSignalIds((current) => [signalId, ...current]);
    setSelectedEntityId(entityId); setSavedSignalId(signalId); setShareStep(4);
  };

  const runSearch = (forced?: string) => {
    const nextQuery = (forced ?? query).trim();
    if (!nextQuery) return;
    if (forced) setQuery(forced);
    setSearchMatches(searchCmtEntities(nextQuery, entities, signals));
    setSearchRan(true);
    go("search");
  };
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter" && query.trim()) runSearch(); };
  const openEntity = (id: string) => { setSelectedEntityId(id); go("entity"); };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")} aria-label="TikTak CMT - Trang chủ"><span className="brand-mark">T</span><span><strong>TIKTAK</strong><small>CMT</small></span></button>
        <div className="prototype-pill"><span /> PROTOTYPE ĐỘC LẬP</div>
        <button className="turn-pill" onClick={() => go("turns")}><Icon name="turns" /> <strong>{turns}</strong> lượt</button>
      </header>

      {view === "home" && (
        <div className="screen home-screen">
          <section className="home-hero">
            <p className="kicker">GÓP 1 <span>→</span> NHẬN 10</p>
            <h1>KHO TRẢI NGHIỆM TỐT<br /><em>CỦA CỘNG ĐỒNG</em></h1>
            <p className="lead">Biết chỗ nào tốt, góp cho mọi người cùng biết.</p>
            <button className="share-cta" onClick={startShare}><span><Icon name="camera" /></span><strong>Chia sẻ trải nghiệm tốt</strong><small>Chụp hóa đơn hoặc biển hiệu</small><b>→</b></button>
            <div className="home-search">
              <Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onSearchKey} placeholder="Hỏi: Cái gì tốt ở đâu?" aria-label="Tìm trải nghiệm tốt" />
              <button onClick={() => query.trim() && runSearch()} aria-label="Tìm kiếm">→</button>
            </div>
            <div className="query-chips"><button onClick={() => runSearch("Ở Hải Phòng có quán phở nào ngon?")}>Phở ngon Hải Phòng</button><button onClick={() => runSearch("Quanh Cầu Giấy có cafe nào yên tĩnh?")}>Cafe yên tĩnh</button><button onClick={() => runSearch("Có chỗ makeup đẹp không?")}>Makeup đẹp</button></div>
          </section>
          <section className="simple-principle">
            <div className="principle-copy"><span className="section-no">01</span><h2>Một điều tốt.<br />Một nơi thật.</h2><p>Không sao, không xếp hạng, không bài quảng cáo. Chỉ lưu lại điều ai đó thực sự thấy tốt — ở đâu.</p></div>
            <div className="flow-card"><div><span>1</span><b>CHỤP</b><small>Hóa đơn hoặc biển hiệu</small></div><i>→</i><div><span>2</span><b>XÁC NHẬN</b><small>Tên nơi + địa chỉ</small></div><i>→</i><div><span>3</span><b>GÓP</b><small>Vài dòng điều tốt</small></div></div>
          </section>
          <p className="demo-disclaimer">Dữ liệu hiển thị trong prototype là dữ liệu minh họa.</p>
        </div>
      )}

      {view === "share" && (
        <div className="screen inner-screen">
          <div className="screen-heading"><button onClick={() => shareStep > 1 && shareStep < 4 ? setShareStep(shareStep - 1) : go("home")} aria-label="Quay lại"><Icon name="back" /></button><div><small>CHIA SẺ TRẢI NGHIỆM TỐT</small><h1>{shareStep === 1 ? "Nơi này là đâu?" : shareStep === 2 ? "TikTak nhận diện được" : shareStep === 3 ? "Điều gì làm bạn thấy tốt?" : "Đã góp một điều tốt"}</h1></div><span className="step-count">{shareStep < 4 ? `${shareStep}/3` : "✓"}</span></div>
          {shareStep < 4 && <div className="progress"><i style={{ width: `${shareStep * 33.33}%` }} /></div>}

          {shareStep === 1 && (
            <section className="share-body">
              <div className={`capture-card ${hasPhoto ? "has-photo" : ""}`}>
                {photoUrl ? <img src={photoUrl} alt="Ảnh hóa đơn hoặc biển hiệu vừa chọn" /> : hasPhoto ? <div className="demo-sign"><small>MAKEUP · HAIR · PHOTO</small><strong>LINH</strong><b>Makeup Studio</b><span>123 Nguyễn Trãi · Hà Nội</span></div> : <div className="capture-empty"><span><Icon name="camera" /></span><strong>Chụp hóa đơn hoặc biển hiệu</strong><p>TikTak sẽ đọc tên và địa chỉ nhìn thấy trong ảnh.</p></div>}
              </div>
              {!hasPhoto ? <><label className="main-action camera-action"><input type="file" accept="image/*" capture="environment" onChange={handleFile} /><Icon name="camera" /> Mở camera / Chọn ảnh</label><button className="secondary-action" onClick={useDemoPhoto}><Icon name="spark" /> Dùng ảnh biển hiệu minh họa</button><button className="manual-link" onClick={useManual}>Không có ảnh? <u>Nhập tên và địa chỉ</u></button></> : <><button className="main-action" onClick={runExtraction} disabled={analyzing}>{analyzing ? <><span className="spinner" /> Đang đọc ảnh…</> : <><Icon name="spark" /> Nhận diện địa điểm</>}</button><label className="replace-photo"><input type="file" accept="image/*" capture="environment" onChange={handleFile} /><Icon name="edit" /> Chọn ảnh khác</label></>}
              <div className="ai-note"><Icon name="spark" /><div><strong>Trong prototype</strong><p>Camera/tải ảnh chạy thật. OCR & Vision đang mô phỏng có kiểm soát để kiểm chứng luồng; chưa gửi ảnh tới AI bên ngoài.</p></div></div>
            </section>
          )}

          {shareStep === 2 && (
            <section className="share-body">
              {extractReady && sourceType === "PHOTO" && <div className="confidence"><Icon name="check" /><div><strong>Đã nhận diện ảnh</strong><small>Hãy kiểm tra lại tên nơi và địa chỉ</small></div><span>AI EXTRACT</span></div>}
              {sourceType === "MANUAL" && <div className="manual-warning"><strong>Nhập tay là phương án dự phòng</strong><p>Chỉ lưu khi có thể xác định một nơi cụ thể. TikTak không tự suy diễn.</p></div>}
              <div className="form-card">
                <label><span>TÊN NƠI</span><div><input value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder="Ví dụ: Linh Makeup Studio" /><Icon name="edit" /></div></label>
                <label><span>ĐỊA CHỈ</span><div><textarea rows={2} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" /><Icon name="edit" /></div></label>
                <label><span>LOẠI HÌNH AI NHẬN DIỆN</span><div><input value={businessType} onChange={(event) => setBusinessType(event.target.value)} placeholder="Ví dụ: Makeup / làm đẹp" /><Icon name="edit" /></div></label>
              </div>
              <div className="data-rule"><Icon name="pin" /><p><strong>Chỉ cần kiểm tra: đúng tên nơi và đúng địa chỉ.</strong><br />Thông tin này giúp các trải nghiệm sau được gom về đúng một nơi.</p></div>
              <button className="main-action" disabled={!entityName.trim() || !address.trim()} onClick={() => setShareStep(3)}><Icon name="check" /> Đúng nơi này <b>→</b></button>
            </section>
          )}

          {shareStep === 3 && (
            <section className="share-body">
              <div className="place-confirmed"><span><Icon name="pin" /></span><div><small>ĐỊA ĐIỂM ĐÃ XÁC NHẬN</small><strong>{entityName}</strong><p>{address}</p></div><button onClick={() => setShareStep(2)}>Sửa</button></div>
              <label className="feeling-box"><span>ĐIỀU GÌ Ở ĐÂY LÀM BẠN THẤY TỐT?</span><textarea autoFocus rows={6} maxLength={300} value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Ví dụ: Makeup tự nhiên, chụp ảnh lên rất đẹp…" /><small>{rawText.length}/300 · Chỉ cần vài dòng thật</small></label>
              {rawText.trim() && <div className="understood"><div className="understood-head"><Icon name="spark" /><strong>TikTak hiểu từ nội dung của bạn</strong><span>MÔ PHỎNG</span></div><dl><div><dt>Nhóm</dt><dd>{derived.category}</dd></div><div><dt>Món / dịch vụ</dt><dd>{derived.item}</dd></div><div><dt>Điểm tốt</dt><dd>{derived.points.map((point) => <span key={point}>{point}</span>)}</dd></div></dl><p>Nội dung bạn viết luôn được giữ nguyên.</p></div>}
              <button className="main-action" disabled={rawText.trim().length < 8} onClick={saveExperience}>Chia sẻ trải nghiệm tốt <b>→</b></button>
            </section>
          )}

          {shareStep === 4 && (
            <section className="success-body"><div className="success-mark"><span>✓</span><i /><i /></div><p className="kicker">GÓP 1 <span>→</span> NHẬN 10</p><h2>Đã thêm một trải nghiệm thật<br />vào kho CMT.</h2><p>Trải nghiệm của bạn đã được thêm vào kho CMT để cộng đồng có thể tìm lại khi cần.</p><div className="reward-card"><span>+10</span><div><strong>Lượt khám phá</strong><small>Tìm thêm điều tốt từ cộng đồng</small></div></div><button className="main-action" onClick={() => openEntity(selectedEntityId)}>Xem nơi vừa đóng góp <b>→</b></button><button className="secondary-action" onClick={() => { resetShare(); go("home"); }}>Về trang chủ</button><small className="saved-id">Đã lưu cục bộ · {savedSignalId.slice(-8)}</small></section>
          )}
        </div>
      )}

      {view === "search" && (
        <div className="screen inner-screen search-screen">
          <div className="screen-heading compact"><button onClick={() => go("home")} aria-label="Quay lại"><Icon name="back" /></button><div><small>TÌM KIẾM TỰ NHIÊN</small><h1>Cái gì tốt ở đâu?</h1></div></div>
          <div className="big-search"><Icon name="search" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onSearchKey} placeholder="Hỏi bằng cách bạn vẫn nói…" /><button onClick={() => query.trim() && runSearch()}>Tìm</button></div>
          {!searchRan ? (
            <section className="search-suggestions"><p>THỬ HỎI TIKTAK</p>{["Ở Hải Phòng có quán phở nào ngon?", "Quanh Cầu Giấy có cafe nào yên tĩnh?", "Có chỗ sửa điều hòa được mọi người khen không?", "Gần đây có chỗ makeup đẹp không?"].map((item) => <button key={item} onClick={() => runSearch(item)}><span>“{item}”</span> →</button>)}</section>
          ) : (
            <section className="results">
              <div className="result-summary"><Icon name="spark" /><div><small>TIKTAK ĐANG TÌM TRONG TRẢI NGHIỆM ĐÃ GÓP</small><strong>{query}</strong></div></div>
              {searchMatches.length === 0 ? (
                <div className="empty-search"><span><Icon name="search" /></span><h3>Chưa có trải nghiệm phù hợp</h3><p>Kho CMT hiện chưa có tín hiệu đủ khớp với điều bạn hỏi. TikTak không đưa kết quả khác khu vực hoặc khác nhu cầu chỉ để lấp chỗ trống.</p><button className="secondary-action" onClick={() => { setQuery(""); setSearchRan(false); }}>Hỏi lại theo cách khác</button></div>
              ) : (
                <>
                  <div className="result-title"><p>{searchMatches.length} nơi có trải nghiệm phù hợp</p><span>Không quảng cáo · Không xếp hạng</span></div>
                  {searchMatches.map((match) => {
                    const entity = entities.find((item) => item.entity_id === match.id);
                    if (!entity) return null;
                    const related = signals.filter((item) => item.entity_id === match.id);
                    return <button className="result-card" key={match.id} onClick={() => openEntity(match.id)}><div className="result-visual"><span>{entity.categories_seen[0]?.slice(0,1)}</span><small>TRẢI NGHIỆM<br />CỘNG ĐỒNG</small></div><div className="result-copy"><div className="result-meta"><span><Icon name="pin" /> {entity.location}</span><b>{related.length} trải nghiệm</b></div><h3>{entity.entity_name}</h3><p>{entity.address}</p>{match.reasons.length > 0 && <div className="match-reasons">{match.reasons.map((reason) => <span key={reason}><Icon name="check" /> {reason}</span>)}</div>}<div className="praise">Mọi người khen: {entity.good_points.slice(0,3).map((point) => <span key={point}>{point}</span>)}</div>{related[0]?.raw_text && <blockquote>“{related[0].raw_text}”</blockquote>}</div><i>→</i></button>;
                  })}
                </>
              )}
            </section>
          )}
        </div>
      )}

      {view === "entity" && selectedEntity && (
        <div className="screen inner-screen entity-screen">
          <div className="entity-cover"><button onClick={() => go(searchRan ? "search" : "home")} aria-label="Quay lại"><Icon name="back" /></button><span>TRẢI NGHIỆM CỘNG ĐỒNG</span><div className="entity-letter">{selectedEntity.entity_name.slice(0,1)}</div></div>
          <section className="entity-content"><p className="entity-type">{selectedEntity.categories_seen.join(" · ")}</p><h1>{selectedEntity.entity_name}</h1><p className="entity-address"><Icon name="pin" /> {selectedEntity.address}</p><div className="entity-actions"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEntity.entity_name + " " + selectedEntity.address)}`} target="_blank" rel="noreferrer"><Icon name="route" /> Chỉ đường Google Maps</a></div><div className="evidence-strip"><div><strong>{selectedSignals.length}</strong><span>trải nghiệm thật</span></div><div><strong>{selectedEntity.items_seen.length}</strong><span>món / dịch vụ</span></div><div><strong>{selectedEntity.good_points.length}</strong><span>điểm tốt</span></div></div><section className="good-at"><small>CỘNG ĐỒNG TỪNG THẤY TỐT Ở ĐÂY</small><div>{selectedEntity.good_points.map((point) => <span key={point}><Icon name="check" /> {point}</span>)}</div></section><section className="signals-list"><div className="list-heading"><small>CÁC TRẢI NGHIỆM ĐÃ GÓP</small><span>{selectedSignals.length} đóng góp</span></div>{selectedSignals.map((signal) => <article key={signal.signal_id}><div className="signal-top"><span>{signal.contributor === "Bạn" ? "B" : "C"}</span><div><strong>{signal.contributor}</strong><small>{new Date(signal.created_at).toLocaleDateString("vi-VN")} · {signal.source_type === "PHOTO" ? "Có ảnh xác nhận" : "Nhập tay"}</small></div></div><blockquote>“{signal.raw_text}”</blockquote><div className="signal-tags"><span>{signal.category}</span><span>{signal.item_mentioned}</span></div></article>)}</section><div className="entity-rule"><strong>Một nơi, nhiều trải nghiệm</strong><p>Mỗi đóng góp giữ món, dịch vụ và điều tốt riêng; các trải nghiệm được gom về cùng nơi theo tên và địa chỉ đã xác nhận.</p></div></section>
        </div>
      )}

      {view === "turns" && (
        <div className="screen inner-screen turns-screen"><div className="screen-heading compact"><button onClick={() => go("home")} aria-label="Quay lại"><Icon name="back" /></button><div><small>GÓP 1 · NHẬN 10</small><h1>Lượt của bạn</h1></div></div><section className="turn-balance"><span><Icon name="turns" /></span><small>LƯỢT KHÁM PHÁ HIỆN CÓ</small><strong>{turns}</strong><p>Mỗi trải nghiệm thật bạn góp giúp kho CMT tốt hơn cho chính bạn và cộng đồng.</p></section><div className="turn-stats"><div><strong>{contributionCount}</strong><span>Đã góp</span></div><div><strong>{contributionCount * 10}</strong><span>Lượt nhận thêm</span></div></div><section className="my-contributions"><div className="list-heading"><small>ĐÓNG GÓP CỦA BẠN</small><span>{contributionCount}</span></div>{contributionCount === 0 ? <div className="empty-contribution"><span><Icon name="share" /></span><h3>Bạn chưa góp trải nghiệm nào</h3><p>Bắt đầu bằng một hóa đơn hoặc biển hiệu của nơi bạn thấy tốt.</p><button className="main-action" onClick={startShare}>Chia sẻ trải nghiệm tốt</button></div> : userSignalIds.map((id) => { const signal = signals.find((item) => item.signal_id === id)!; const entity = entities.find((item) => item.entity_id === signal?.entity_id); return <button key={id} onClick={() => entity && openEntity(entity.entity_id)}><span><Icon name="check" /></span><div><strong>{entity?.entity_name}</strong><p>{signal.raw_text}</p></div><i>→</i></button>; })}</section></div>
      )}

      {view !== "share" && view !== "entity" && (
        <nav className="bottom-nav" aria-label="Chức năng chính"><button className={view === "home" ? "active" : ""} onClick={() => go("home")}><Icon name="home" /><span>TRANG CHỦ</span></button><button className={view === "share" ? "active" : ""} onClick={startShare}><Icon name="share" /><span>CHIA SẺ</span></button><button className={view === "search" ? "active" : ""} onClick={() => go("search")}><Icon name="search" /><span>TÌM KIẾM</span></button><button className={view === "turns" ? "active" : ""} onClick={() => go("turns")}><Icon name="turns" /><span>LƯỢT</span></button></nav>
      )}
    </main>
  );
}
