import { grey, green, blue, red, orange } from "@ant-design/colors";
export const SKILL_LIST = [
  "NodeJS",
  "NestJS",
  "TypeScript",
  "Frontend",
  "Backend",
  "Fullstack",
  "Data Scientist",
  "DevOps",
  "Embedded",
  "Java",
  "Python",
  "C++",
  "C#",
  ".Net",
  "MySQL",
  "Docker",
];

export const LIST_LOCATION = [
  { label: "Hà Nội", value: "Hà Nội" },
  { label: "Hồ Chí Minh", value: "Hồ Chí Minh" },
  { label: "Đà Nẵng", value: "Đà Nẵng" },
  { label: "Tất cả thành phố", value: "Tất cả thành phố" },
];

export const SalaryOptions = [
  { label: "Tất cả", value: "Tất cả" },
  { label: "Dưới 10 triệu", value: "0-10000000" },
  { label: "10-20 triệu", value: "10000000-20000000" },
  { label: "20-25 triệu", value: "20000000-25000000" },
  { label: "25-30 triệu", value: "25000000-30000000" },
  { label: "30-35 triệu", value: "30000000-35000000" },
  { label: "35-50 triệu", value: "35000000-50000000" },
  { label: "Trên 50 triệu", value: "50000000-1000000000" },
];

export const experienceOptions = [
  { label: "Tất cả", value: "Tất cả" },
  { label: "INTERN", value: "INTERN" },
  { label: "FRESHER", value: "FRESHER" },
  { label: "JUNIOR", value: "JUNIOR" },
  { label: "MIDDLE", value: "MIDDLE" },
  { label: "SENIOR", value: "SENIOR" },
];

export const sortOption = [
  { value: "createdAt", label: "Mới đăng tuyển" },
  { value: "updatedAt", label: "Mới cập nhật" },
];

export function colorMethod(
  method: "POST" | "PUT" | "GET" | "DELETE" | string
) {
  switch (method) {
    case "POST":
      return green[6];
    case "PUT":
      return orange[6];
    case "GET":
      return blue[6];
    case "DELETE":
      return red[6];
    default:
      return grey[10];
  }
}
