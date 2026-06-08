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
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.join(base_dir, "images")
    
    # Register System Fonts before adding page (so header can use them)
    # Using macOS built-in STHeiti Light for regular, Medium for bold
    pdf.add_font('STHeiti', style='', fname='/System/Library/Fonts/STHeiti Light.ttc')
    pdf.add_font('STHeiti-Bold', style='', fname='/System/Library/Fonts/STHeiti Medium.ttc')
    
    # --- PAGE 1: TITLE & CORE UI ---
    pdf.add_page()
    
    # Header Title Block
    pdf.set_font('STHeiti-Bold', size=22)
    pdf.set_text_color(15, 23, 42) # slate-900
    pdf.cell(0, 12, '大巨蛋演繹個人跑位定位系統', ln=1, align='C')
    
    pdf.set_font('STHeiti-Bold', size=14)
    pdf.set_text_color(217, 119, 6) # amber-700
    pdf.cell(0, 8, '行動端系統使用手冊 (通用場次版)', ln=1, align='C')
    pdf.ln(6)
    
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
        
    # Section 1: Search & Filter
    draw_heading("一、 主介面與查詢功能")
    p1 = (
        "請參考右側【圖一：系統主查詢介面】進行操作：\n"
        "1. 起點搜尋與聯想清單：\n"
        "   - 在畫面上方的搜尋框中輸入您的起點座標（例如：「4-50」或「7-37」）。\n"
        "   - 輸入數字時，下方會出現匹配的座標清單，點選即可快速載入資料。\n"
        "2. 組別篩選器：\n"
        "   - 搜尋框下方提供「組別篩選」選單，可過濾 A白、A藍、B白、B藍 等不同舞台區域組別，協助您精準定位。\n"
        "3. 頁籤切換（手機端最佳化）：\n"
        "   - 系統提供「網格定位」、「跑位引導」、「隊形詳情」三個頁籤，您可以隨時切換。"
    )
    pdf.multi_cell(110, 5.5, p1)
    pdf.ln(4)

    # Section 2: Grid View intro
    draw_heading("二、 網格定位功能 (核心定位地圖)")
    p2 = (
        "網格定位是本系統的核心功能，顯示以您的「起點座標」為中心 (0,0) 的相對座標系統：\n"
        "1. 點位標記說明：\n"
        "   - 藍色圓點：代表您的「起點」（即 Home 位置）。\n"
        "   - 灰色圓點：代表演繹過程中的「上一個點位」（Prev）。\n"
        "   - 黃色星星/地標：代表「目前隊形」您應該站立的位置（Current）。\n"
        "2. 指引線路徑：黃色粗線與箭頭為目前步驟的行進動線。勾選「顯示完整 6 點軌跡」後，會同時以各步驟的專屬色彩顯示完整的連續移動路線。"
    )
    pdf.multi_cell(110, 5.5, p2)
    
    # Embed vertical screenshot of main app UI on the right
    img1_path = os.path.join(images_dir, "media__1780728410363.png")
    if os.path.exists(img1_path):
        pdf.image(img1_path, x=135, y=55, w=60)
        # Draw image caption under the vertical screenshot
        pdf.set_y(144)
        pdf.set_x(135)
        pdf.set_font('STHeiti-Bold', size=8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(60, 5, '【圖一：系統主查詢介面】', border=0, align='C')
        
    # --- PAGE 2: BUTTON EXPLANATIONS ---
    pdf.add_page()
    
    # Section 3: Button Explanations
    draw_heading("三、 系統畫面按鈕功能詳細說明")
    p3 = (
        "對照右側【圖二：個人相對網格定位與控制】標示，系統按鈕功能說明如下：\n\n"
        "1. 查詢與搜尋控制項：\n"
        "   - 搜尋輸入框：位於頂部，點選並輸入起點座標以開始跑位查詢。\n"
        "   - 清除按鈕 (X)：輸入框有文字時顯示於右側，點選可一鍵清空搜尋內容。\n"
        "   - 組別下拉選單：點選可過濾特定的演繹組別區域。\n\n"
        "2. 隊形步驟與頁籤切換按鈕：\n"
        "   - 「上一個」與「下一個」按鈕：位於地圖上方，用於在 6 個演繹隊形步驟間切換。\n"
        "   - 頁籤按鈕（網格定位 / 跑位引導 / 隊形詳情）：位於中間，切換不同檢視視角。\n\n"
        "3. 地圖控制按鈕（位於網格地圖正下方）：\n"
        "   - 放大按鈕 (+) / 縮小按鈕 (-)：調整網格地圖的縮放倍率。放大後可使用滑鼠拖曳（電腦端）或手指拖移（行動裝置）來平移觀看不同區域。\n"
        "   - 逆時針旋轉 (左旋轉鈕) / 順時針旋轉 (右旋轉鈕)：每按一次將地圖旋轉 45 度角。當您面向不同舞台方向演繹時，可旋轉地圖使網格與您的真實視覺方向一致，地標與座標標記也會隨之旋轉以利讀取。\n"
        "   - 重設按鈕 (Reset)：位於最右側，一鍵恢復地圖的縮放倍率、平移位置與旋轉角度。\n\n"
        "4. 資料匯出按鈕：\n"
        "   - 「查看與下載所有圖」按鈕：位於最下方，點選可開啟定點圖預覽彈窗並批次下載高清列印用 A4 PDF 定點圖。"
    )
    pdf.multi_cell(110, 5.2, p3)
    
    # Embed horizontal screenshot of the grid map on the right
    img2_path = os.path.join(images_dir, "media__1780728431406.png")
    if os.path.exists(img2_path):
        pdf.image(img2_path, x=135, y=20, w=60)
        # Draw image caption under the horizontal screenshot
        pdf.set_y(70)
        pdf.set_x(135)
        pdf.set_font('STHeiti-Bold', size=8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(60, 5, '【圖二：相對網格定位圖】', border=0, align='C')

    # --- PAGE 3: WALKTHROUGH, EXPORT, GENERAL ---
    pdf.add_page()
    
    # Section 4: Walkthrough & Details
    draw_heading("四、 跑位引導與隊形詳情")
    p4 = (
        "請參考右側【圖三：手機版跑位引導步驟】清單：\n"
        "1. 跑位引導步驟：\n"
        "   - 在「跑位引導」頁籤中，系統以步驟清單詳細列出 6 個演繹步驟的行進指引。\n"
        "   - 每一步驟包含：目標絕對座標、行進方向提示（如：向右後 3.5 步）、直線距離步數，以及對應的歌詞OS段落。\n\n"
        "2. 隊形詳情圖卡：\n"
        "   - 在「隊形詳情」頁籤中，列出了 6 大隊形點位的專屬圖卡。\n"
        "   - 詳細顯示座標、相對起點的總偏移植，以及從上一步驟移動而來的相對向量。"
    )
    pdf.multi_cell(110, 6, p4)
    
    # Embed vertical screenshot of walkthrough steps list
    img3_path = os.path.join(images_dir, "media__1780729165893.png")
    if os.path.exists(img3_path):
        pdf.image(img3_path, x=135, y=20, w=60)
        # Draw image caption under the vertical screenshot
        pdf.set_y(93)
        pdf.set_x(135)
        pdf.set_font('STHeiti-Bold', size=8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(60, 5, '【圖三：手機版跑位引導步驟】', border=0, align='C')
        
    # Move cursor down below the image height to draw Section 5 & 6
    pdf.set_y(98)

    # Section 5: Export
    draw_heading("五、 PDF 匯出與列印")
    p5 = (
        "1. 查看與下載所有圖：\n"
        "   - 點擊「查看與下載所有圖」按鈕，會開啟彈出視窗預覽 6 個演繹隊形的縮圖。\n"
        "2. 高解析度 PDF 下載：\n"
        "   - 點擊縮圖下方的「下載 PDF」或頂部的「下載全部定點圖」，系統將自動產生高解析度的 A4 PDF 定點圖。\n"
        "   - **自動重設功能**：不論您當前的地圖縮放、平移或旋轉狀態為何，匯出的 PDF zh-TW 版皆會自動重設為無縮放的全景視角，確保版面完整無遮擋，方便列印攜帶。"
    )
    pdf.multi_cell(0, 6, p5)
    pdf.ln(2)

    # Section 6: General Version
    draw_heading("六、 通用場次版特別說明")
    p6 = (
        "在「通用場次」版本中，為保護隱私並提供各場次通用的跑位模板，系統進行了以下調整：\n"
        "1. 隱去真實姓名：網格地圖與介面上已完全隱去表演者的真實姓名，僅顯示起點座標及編號。\n"
        "2. 標記字樣更新：水印標記及字樣已由「身分證」全數改為「起點座標」，視覺更簡潔易懂。"
    )
    pdf.multi_cell(0, 6, p6)
    pdf.ln(6)
    
    # Footer Notice Box
    pdf.set_font('STHeiti', size=9)
    pdf.set_text_color(100, 116, 139) # slate-500
    pdf.set_fill_color(248, 250, 252) # slate-50
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(15, pdf.get_y(), 180, 13, 'DF')
    pdf.set_y(pdf.get_y() + 1.5)
    pdf.cell(5) # spacer
    pdf.multi_cell(170, 5, "◆ 溫馨提示：本系統建議使用行動裝置以直式瀏覽以獲得最佳操作體驗。若有任何操作疑問，請洽演繹種子團隊窗口。", align="C")
    
    # Save the file
    pdf.output("使用手冊.pdf")
    print("使用手冊.pdf has been generated successfully with button explanations!")

if __name__ == "__main__":
    create_manual()
