import os
from fpdf import FPDF

class ManualPDF(FPDF):
    def header(self):
        # Header text
        self.set_font('STHeiti', size=9)
        self.set_text_color(148, 163, 184) # light slate gray
        self.cell(0, 8, '大巨蛋演繹個人跑位定位系統 — 使用手冊', border=0, align='L')
        self.cell(0, 8, '通用場次版', border=0, ln=1, align='R')
        # Draw a thin horizontal divider line
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        # Footer text
        self.set_y(-15)
        self.set_font('STHeiti', size=8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f'第 {self.page_no()} 頁', border=0, align='C')

def create_manual():
    pdf = ManualPDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(15, 15, 15)
    
    # Register System Fonts before adding page (so header can use them)
    # Using macOS built-in STHeiti Light for regular, Medium for bold
    pdf.add_font('STHeiti', style='', fname='/System/Library/Fonts/STHeiti Light.ttc')
    pdf.add_font('STHeiti-Bold', style='', fname='/System/Library/Fonts/STHeiti Medium.ttc')
    
    pdf.add_page()
    
    # 1. Header Title Block
    pdf.set_font('STHeiti-Bold', size=22)
    pdf.set_text_color(15, 23, 42) # slate-900
    pdf.cell(0, 12, '大巨蛋演繹個人跑位定位系統', ln=1, align='C')
    
    pdf.set_font('STHeiti-Bold', size=14)
    pdf.set_text_color(217, 119, 6) # amber-700
    pdf.cell(0, 8, '行動端系統使用手冊 (通用場次版)', ln=1, align='C')
    pdf.ln(8)
    
    # Introduction block
    pdf.set_font('STHeiti', size=10)
    pdf.set_text_color(71, 85, 105) # slate-600
    intro_text = (
        "本系統專為大巨蛋演繹人員設計，旨在提供一個直觀、流暢且具高互動性的定位查詢工具。 "
        "演繹人員只需輸入自己所在的「起點座標」，系統即會自動繪製並計算在 6 大不同演繹隊形 "
        "（基本、圓型、行願、靜思、點燈、大Ｖ）中的相對位置、行進方向、步數以及歌詞段落。 "
        "本手冊將指引您熟悉系統的各項介面與進階操作功能。"
    )
    pdf.multi_cell(0, 6, intro_text)
    pdf.ln(6)
    
    # Helper to draw headings
    def draw_heading(text):
        pdf.set_font('STHeiti-Bold', size=12)
        pdf.set_text_color(15, 23, 42) # slate-900
        # Draw a gold square decorator
        pdf.set_fill_color(217, 119, 6)
        pdf.rect(pdf.get_x(), pdf.get_y() + 1, 3, 4, 'F')
        pdf.cell(5) # spacer
        pdf.cell(0, 6, text, ln=1)
        pdf.ln(2)
        pdf.set_font('STHeiti', size=10)
        pdf.set_text_color(71, 85, 105)
        
    # Section 1
    draw_heading("一、 主介面與查詢功能")
    p1 = (
        "1. 起點搜尋與聯想清單：\n"
        "   - 在畫面上方的搜尋框中輸入您的起點座標（例如：「4-50」或「7-37」）。\n"
        "   - 輸入數字時，下方會出現匹配的座標清單，點選即可快速載入演繹人員資料。\n"
        "2. 組別篩選器：\n"
        "   - 搜尋框下方提供「組別篩選」選單，可過濾 A白、A藍、B白、B藍 等不同舞台區域組別，協助您精準定位。\n"
        "3. 頁籤切換（手機端最佳化）：\n"
        "   - 系統提供「網格定位」、「跑位引導」、「隊形詳情」三個按鈕頁籤，您可以隨時切換檢視。"
    )
    pdf.multi_cell(0, 6, p1)
    pdf.ln(6)

    # Section 2
    draw_heading("二、 網格定位功能（核心檢視）")
    p2 = (
        "網格定位是本系統的核心功能，顯示以您的「起點座標」為中心 (0,0) 的相對座標系統：\n"
        "1. 點位標記說明：\n"
        "   - 藍色圓點：代表您的「起點」（即 Home 位置）。\n"
        "   - 灰色圓點：代表演繹過程中的「上一個點位」（Prev）。\n"
        "   - 黃色星星/地標：代表「目前隊形」您應該站立的位置（Current）。\n"
        "2. 指引線與路徑：\n"
        "   - 黃色粗線與箭頭為目前步驟的行進動線。\n"
        "   - 勾選「顯示完整 6 點軌跡」後，地圖上會同時以各步驟的專屬色彩顯示完整的連續移動路線。\n"
        "3. 舞台背景浮水印：\n"
        "   - 地圖背後繪有大巨蛋的實體舞台藍圖（包括甲乙舞台、弧形階梯與放射狀台階等），方便演繹人員對照真實地貌。"
    )
    pdf.multi_cell(0, 6, p2)
    pdf.ln(6)

    # Section 3
    draw_heading("三、 進階地圖控制與置中對齊")
    p3 = (
        "地圖下方設有五個 Tactile 圓形控制按鈕，提供極佳的互動反饋：\n"
        "1. 放大 (+) 與 縮小 (-)：\n"
        "   - 可放大地圖以看清細節，並支援在放大狀態下使用手指拖移（行動裝置）或滑鼠拖曳（電腦端）來移動平移視角。\n"
        "2. 逆時針旋轉 (左旋轉鈕) 與 順時針旋轉 (右旋轉鈕)：\n"
        "   - 支援 45 度角增量旋轉。當您面向不同方向演繹時，可旋轉地圖使網格與您的真實視覺方向一致，地標與座標標記也會隨之旋轉以利讀取。\n"
        "3. 自動對齊功能：\n"
        "   - 切換「下一個」或「上一個」步驟時，若地圖處於放大或旋轉狀態，視角會自動計算旋轉矩陣，將您目前活躍的黃色地標自動置中對齊。\n"
        "4. 重設按鈕 (Reset)：\n"
        "   - 一鍵將縮放倍率、平移位置及旋轉角度全部恢復為預設狀態。"
    )
    pdf.multi_cell(0, 6, p3)
    pdf.ln(6)

    # Add a page break for the rest
    pdf.add_page()
    
    # Section 4
    draw_heading("四、 跑位引導與隊形詳情")
    p4 = (
        "1. 跑位引導步驟：\n"
        "   - 在「跑位引導」頁籤中，系統以步驟清單詳細列出 6 個演繹步驟的行進指引。\n"
        "   - 每一步驟包含：目標絕對座標、行進方向提示（如：向右後 3.5 步）、直線距離步數，以及對應的歌詞OS段落。\n"
        "2. 隊形詳情圖卡：\n"
        "   - 在「隊形詳情」頁籤中，列出了 6 大隊形點位的專屬圖卡。\n"
        "   - 詳細顯示座標、相對起點的總偏移植，以及從上一步驟移動而來的相對向量。"
    )
    pdf.multi_cell(0, 6, p4)
    pdf.ln(6)

    # Section 5
    draw_heading("五、 PDF 匯出與列印")
    p5 = (
        "1. 查看與下載所有圖：\n"
        "   - 點擊「查看與下載所有圖」按鈕，會開啟彈出視窗預覽 6 個演繹隊形的縮圖。\n"
        "2. 高解析度 PDF 下載：\n"
        "   - 點擊縮圖下方的「下載 PDF」或頂部的「下載全部定點圖」，系統將自動產生高解析度的 A4 PDF 定點圖。\n"
        "   - **自動重設功能**：不論您當前的地圖縮放、平移或旋轉狀態為何，匯出的 PDF zh-TW 版皆會自動重設為無縮放的全景視角，確保版面完整無遮擋，方便列印攜帶。"
    )
    pdf.multi_cell(0, 6, p5)
    pdf.ln(6)

    # Section 6
    draw_heading("六、 通用場次版特別說明")
    p6 = (
        "在「通用場次」版本中，為保護隱私並提供各場次通用的跑位模板，系統進行了以下調整：\n"
        "1. 隱去真實姓名：網格地圖與介面上已完全隱去表演者的真實姓名，僅顯示起點座標及編號。\n"
        "2. 標記字樣更新：水印標記及字樣已由「身分證」全數改為「起點座標」，視覺更簡潔易懂。"
    )
    pdf.multi_cell(0, 6, p6)
    pdf.ln(8)
    
    # Footer Notice
    pdf.set_font('STHeiti', size=9)
    pdf.set_text_color(100, 116, 139) # slate-500
    pdf.set_fill_color(248, 250, 252) # slate-50
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(15, pdf.get_y(), 180, 15, 'DF')
    pdf.set_y(pdf.get_y() + 2)
    pdf.cell(5) # spacer
    pdf.multi_cell(170, 5, "◆ 溫馨提示：本系統建議使用行動裝置以直式瀏覽以獲得最佳操作體驗。若有任何操作疑問，請洽演繹種子團隊窗口。", align="C")
    
    # Save the file
    pdf.output("使用手冊.pdf")
    print("使用手冊.pdf has been generated successfully!")

if __name__ == "__main__":
    create_manual()
