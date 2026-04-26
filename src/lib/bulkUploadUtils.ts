import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Product } from "@/types";

export const PRODUCT_TEMPLATE_HEADERS = ["name", "price", "category", "image", "stock", "description", "section", "vendorId"];

export const downloadTemplate = () => {
  const csvContent = PRODUCT_TEMPLATE_HEADERS.join(",") + "\n" + 
    'Example Product,99,Vegetables,https://example.com/image.jpg,100,"Short description of product",BB\n' +
    'Cafe Item,150,Bakery,https://example.com/cafe.jpg,50,"Fresh cake",CAFE';
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "product_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseFile = async (file: File): Promise<Partial<Product>[]> => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as Partial<Product>[]);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } else if (extension === "xlsx" || extension === "xls") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json as Partial<Product>[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  } else {
    throw new Error("Unsupported file format. Please use CSV or Excel.");
  }
};

export const validateProducts = (products: any[], defaultSection: "BB" | "CAFE" = "BB"): { valid: Partial<Product>[], invalid: any[] } => {
  const valid: Partial<Product>[] = [];
  const invalid: any[] = [];

  products.forEach((p, index) => {
    const name = p.name?.toString().trim();
    const price = parseFloat(p.price);
    const category = p.category?.toString().trim();
    const stock = parseInt(p.stock) || 0;
    const image = p.image?.toString().trim() || "https://placehold.co/400x400?text=No+Image";
    const section = (p.section?.toString().trim().toUpperCase() === "CAFE") ? "CAFE" : 
                    (p.section?.toString().trim().toUpperCase() === "BB") ? "BB" : defaultSection;

    if (name && !isNaN(price) && category) {
      valid.push({
        id: p.id || undefined,
        name,
        price,
        category,
        image,
        stock,
        description: p.description?.toString().trim() || "",
        active: p.active !== undefined ? (p.active === "true" || p.active === true) : true,
        section: section as any,
        vendorId: p.vendorId?.toString().trim() || "",
        mrp: parseFloat(p.mrp) || price,
        subcategory: p.subcategory?.toString().trim() || ""
      });
    } else {
      invalid.push({ row: index + 2, data: p }); // index + 2 because CSV header is 1st row and it's 0-indexed
    }
  });

  return { valid, invalid };
};
