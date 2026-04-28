import os

def load_charset(path: str = "language/vi_char.txt") -> list[str]:
    """
    Load character set from a text file.
    
    Args:
        path (str): Path to the charset file.
        
    Returns:
        list[str]: A list of unique characters/tokens.
        
    Raises:
        FileNotFoundError: If the charset file is not found.
        UnicodeDecodeError: If the file is not properly UTF-8 encoded.
        ValueError: If there are duplicate characters in the file.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Lỗi: Không tìm thấy file charset tại đường dẫn '{path}'")
    
    chars = []
    seen = set()
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                # Loại bỏ ký tự xuống dòng (newline) và các khoảng trắng thừa ở đuôi (nếu không phải là dấu cách mong muốn)
                # Lưu ý: Không dùng .strip() trực tiếp để tránh xoá mất token khoảng trắng nếu có khoảng trắng thực sự.
                char = line.rstrip('\n\r')
                
                # Bỏ qua dòng rỗng
                if not char:
                    continue
                
                if char in seen:
                    raise ValueError(f"Lỗi: Phát hiện ký tự trùng lặp '{char}' tại dòng {line_num} trong file '{path}'")
                
                chars.append(char)
                seen.add(char)
                
    except UnicodeDecodeError as e:
        raise UnicodeDecodeError(
            e.encoding, 
            e.object, 
            e.start, 
            e.end, 
            f"Lỗi: File '{path}' không đúng định dạng UTF-8. Vui lòng kiểm tra lại encoding."
        )
        
    return chars

if __name__ == "__main__":
    import sys
    # Cấu hình UTF-8 cho console trên Windows
    if sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            pass

    try:
        # Ví dụ sử dụng
        chars = load_charset()
        print(f"Tổng số ký tự: {len(chars)}")
        print(f"20 ký tự đầu tiên: {chars[:20]}")
    except Exception as e:
        print(e)
