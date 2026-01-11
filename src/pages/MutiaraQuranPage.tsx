import React, { useState } from 'react';
import { Button, Container } from 'react-bootstrap';
import ShareImageModal from '../components/ShareImageModal';

const ExamplePage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  // Contoh daftar gambar Mutiara Quran
  const mutiaraQuranImages = [
    '/images/mutiara-quran-1.png',
    '/images/mutiara-quran-2.png',
    '/images/mutiara-quran-3.png',
    '/images/mutiara-quran-ayah-kecil-1.png',
    '/images/mutiara-quran-ayah-kecil-2.png'
  ];

  const handleOpenModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowModal(true);
  };

  return (
    <Container className="py-4">
      <h1>Mutiara Quran</h1>
      <p>Pilih gambar untuk dibagikan:</p>
      
      <div className="row g-3">
        {mutiaraQuranImages.map((img, index) => (
          <div key={index} className="col-md-4 col-sm-6">
            <div 
              className="card cursor-pointer shadow-sm h-100"
              onClick={() => handleOpenModal(img)}
              style={{ minHeight: '200px' }}
            >
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Gambar {index + 1}</h5>
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                  <img 
                    src={img} 
                    alt={`Mutiara Quran ${index + 1}`} 
                    className="img-fluid rounded"
                    style={{ maxHeight: '120px', objectFit: 'contain' }}
                  />
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(img);
                  }}
                >
                  Lihat Detail & Bagikan
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal untuk berbagi gambar */}
            <ShareImageModal
              isOpen={showModal}              onClose={() => setShowModal(false)}
              initialImageUrl={selectedImage}
      />
    </Container>
  );
};

export default ExamplePage;