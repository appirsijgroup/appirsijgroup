This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Fitur Mutiara Quran - Modal Berbagi Gambar

Kami telah menambahkan komponen modal berbagi gambar khusus untuk fitur Mutiara Quran yang dirancang secara estetik dan responsif. Fitur ini memungkinkan pengguna untuk:

- Melihat gambar Mutiara Quran dengan ukuran yang disesuaikan agar tidak terlalu tinggi
- Menyalin URL gambar
- Mengunduh gambar langsung
- Membagikan ke berbagai platform media sosial (Facebook, Twitter, WhatsApp)

### Struktur File

```
├───components/
│   ├── ShareImageModal.tsx           # Komponen modal berbagi gambar
│   └── FlexibleShareModal.tsx        # Komponen modal fleksibel untuk berbagai jenis konten
├───pages/
│   └───MutiaraQuranPage.tsx          # Contoh penggunaan komponen
├───styles/
│   ├── share-image-modal.css         # Styling khusus untuk modal gambar
│   └── flexible-share-modal.css      # Styling khusus untuk modal fleksibel
```

### Cara Menggunakan

1. Import komponen `ShareImageModal` ke dalam halaman Anda
2. Gunakan dengan menyediakan props `show`, `onHide`, dan `imageUrl`
3. Sertakan juga `title` opsional untuk judul modal

Contoh implementasi:

```jsx
<ShareImageModal
  show={showModal}
  onHide={() => setShowModal(false)}
  imageUrl={selectedImage}
  title="Mutiara Quran - Bagikan Kebijaksanaan"
/>
```

Modal ini dirancang untuk menyesuaikan ukuran gambar agar tetap estetik, terutama untuk ayat-ayat kecil yang tidak akan terlihat terlalu tinggi saat ditampilkan.

## Kontribusi

Kami menyambut kontribusi dari siapa saja. Silakan ikuti langkah-langkah berikut untuk berkontribusi:

1. Fork repository ini
2. Buat branch fitur Anda (`git checkout -b fitur/AwesomeFeature`)
3. Commit perubahan Anda (`git commit -m 'Menambahkan fitur AwesomeFeature'`)
4. Push ke branch Anda (`git push origin fitur/AwesomeFeature`)
5. Buka Pull Request
