import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata = {
  title: "ระบบลงทะเบียนชมรม — แผนก IT วิทยาลัยเทคนิคเชียงใหม่",
  description: "ระบบลงทะเบียนชมรมนักเรียน/นักศึกษา แผนกเทคโนโลยีสารสนเทศ วิทยาลัยเทคนิคเชียงใหม่",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${prompt.variable} h-full`}>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ fontFamily: "'Prompt', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
