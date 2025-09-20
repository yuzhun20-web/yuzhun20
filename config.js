window.AppConfig = {
  DATA_SOURCE: "csv", // "csv" | "api"
  CSV_PATH: "./assets/novel_chapters.csv",
  API_ENDPOINT: "",   // 留空表示不使用；若要用 GAS，填入你的網址即可
  API_PARAMS: {},
  DEFAULT_MODE: "dark",
  TITLE_FIELD: "章標籤",
  SUBTITLE_FIELD: "標題",
  SUBPART_FIELD: "小節",
  CONTENT_FIELD: "內容",
  URL_FIELD: "來源URL",
  STATUS_FIELD: "狀態",
  ID_FIELD: "順序index"
};