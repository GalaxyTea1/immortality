export const SHOP_CATALOG = [
  { itemId: 'kim_dan_dan', category: 'pill', tier: 'heaven', price: 2000 },
  { itemId: 'tu_ha_bi_dien', category: 'book', tier: 'earth', price: 5000 },
  { itemId: 'huyet_ma_kiem', category: 'equipment', tier: 'heaven', price: 10000 },
  { itemId: 'thao_duoc', category: 'material', tier: 'yellow', price: 10 },
  { itemId: 'truc_co_dan', category: 'pill', tier: 'black', price: 500 },
  { itemId: 'tieu_hoan_dan', category: 'pill', tier: 'yellow', price: 50 },
  { itemId: 'tu_khi_dan', category: 'pill', tier: 'yellow', price: 100 },
  { itemId: 'ngoc_boi', category: 'equipment', tier: 'black', price: 800 },
  { itemId: 'cuong_hoa_thach', category: 'material', tier: 'black', price: 500 },
];

export const findShopCatalogItem = (itemId) =>
  SHOP_CATALOG.find((item) => item.itemId === itemId);

export default SHOP_CATALOG;
