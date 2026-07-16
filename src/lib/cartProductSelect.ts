/** Prisma select for product fields needed in cart responses. */
export const CART_PRODUCT_SELECT = {
  id: true,
  code: true,
  name: true,
  costPrice: true,
  retailPrice: true,
  costoIeConReso: true,
  costoIeSenzaReso: true,
  lotSize: true,
  iva: true,
  imageUrl: true,
  imageUrl2: true,
  imageUrl3: true,
  imageUrl4: true,
  imageUrl5: true,
  collezione: true,
  conferente: true,
} as const;
