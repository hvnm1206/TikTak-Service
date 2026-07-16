import test from "node:test";
import assert from "node:assert/strict";
import { searchCmtEntities } from "../app/searchLogic.ts";

const entities = [
  {
    entity_id: "entity_001",
    entity_name: "Phở Gốc Đa",
    address: "18 Lạch Tray, Ngô Quyền, Hải Phòng",
    location: "Hải Phòng",
    categories_seen: ["Ăn uống"],
    items_seen: ["Phở bò", "Quẩy"],
    good_points: ["Nước dùng trong", "Thịt mềm", "Phục vụ nhanh"],
  },
  {
    entity_id: "entity_002",
    entity_name: "Mây Cafe",
    address: "82 Trần Thái Tông, Cầu Giấy, Hà Nội",
    location: "Cầu Giấy, Hà Nội",
    categories_seen: ["Cafe", "Không gian"],
    items_seen: ["Cafe sữa", "Trà đào"],
    good_points: ["Yên tĩnh", "Ghế ngồi thoải mái", "Nhân viên dễ chịu"],
  },
  {
    entity_id: "entity_003",
    entity_name: "An Tâm Điện Lạnh",
    address: "45 Lê Hoàn, TP Thanh Hóa, Thanh Hóa",
    location: "Thanh Hóa",
    categories_seen: ["Sửa chữa", "Điện lạnh"],
    items_seen: ["Điều hòa", "Tủ lạnh"],
    good_points: ["Báo giá trước", "Làm cẩn thận", "Đúng hẹn"],
  },
  {
    entity_id: "entity_004",
    entity_name: "Linh Makeup Studio",
    address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    location: "Thanh Xuân, Hà Nội",
    categories_seen: ["Làm đẹp", "Makeup", "Chụp ảnh"],
    items_seen: ["Makeup tự nhiên", "Trang điểm cô dâu"],
    good_points: ["Lớp nền tự nhiên", "Lên ảnh đẹp", "Tư vấn kỹ"],
  },
];

const signals = [
  {
    entity_id: "entity_001",
    raw_text: "Phở bò ngon, nước dùng trong, thịt mềm và ra món nhanh.",
    category: "Ăn uống",
    item_mentioned: "Phở bò",
    good_points: ["Nước dùng trong", "Thịt mềm", "Phục vụ nhanh"],
  },
  {
    entity_id: "entity_002",
    raw_text: "Cafe yên tĩnh, ghế ngồi thoải mái, hợp ngồi làm việc buổi sáng.",
    category: "Cafe",
    item_mentioned: "Cafe sữa",
    good_points: ["Yên tĩnh", "Thoải mái"],
  },
  {
    entity_id: "entity_003",
    raw_text: "Thợ sửa điều hòa cẩn thận, báo giá trước rồi mới làm.",
    category: "Điện lạnh",
    item_mentioned: "Sửa điều hòa",
    good_points: ["Báo giá trước", "Cẩn thận"],
  },
  {
    entity_id: "entity_004",
    raw_text: "Makeup tự nhiên, chụp ảnh lên rất đẹp và tư vấn màu hợp da.",
    category: "Makeup",
    item_mentioned: "Makeup tự nhiên",
    good_points: ["Tự nhiên", "Lên ảnh đẹp", "Tư vấn kỹ"],
  },
];

const ids = (query) => searchCmtEntities(query, entities, signals).map((item) => item.id);

test("requires location + item + positive evidence together", () => {
  assert.deepEqual(ids("Ở Hải Phòng có quán phở nào ngon?"), ["entity_001"]);
  assert.deepEqual(ids("Quanh Cầu Giấy có cafe nào yên tĩnh?"), ["entity_002"]);
  assert.deepEqual(ids("Có chỗ sửa điều hòa được mọi người khen không?"), ["entity_003"]);
  assert.deepEqual(ids("Có chỗ makeup đẹp không?"), ["entity_004"]);
});

test("never fills a no-match query with unrelated entities", () => {
  assert.deepEqual(ids("Ở Hải Phòng có cafe nào yên tĩnh?"), []);
  assert.deepEqual(ids("Ở Hà Nội có phở ngon không?"), []);
});

test("does not confuse Vietnamese accent collisions such as sữa and sửa", () => {
  assert.deepEqual(ids("Có chỗ sửa điều hòa cẩn thận không?"), ["entity_003"]);
  assert.deepEqual(ids("Cafe sữa ngon ở Cầu Giấy?"), []);
});

test("still accepts unaccented Vietnamese input when the intent is clear", () => {
  assert.deepEqual(ids("sua dieu hoa can than"), ["entity_003"]);
});
