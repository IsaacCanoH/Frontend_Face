import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const FaceCapture = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [hasReference, setHasReference] = useState(false);
  const [message, setMessage] = useState('');

  const backendURL = 'https://backend-face-m7ls.onrender.com';

  // Cargar modelos de face-api.js
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`);
      await faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_URL}/face_recognition`);
      await faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_URL}/face_landmark_68`);
    };

    loadModels();
    checkReferencePhoto();
  }, []);

  // Verificar si hay foto previa
  const checkReferencePhoto = async () => {
    try {
      await axios.get(`${backendURL}/photo`);
      setHasReference(true);
    } catch {
      setHasReference(false);
    }
  };

  // Iniciar cámara
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  // Capturar foto y procesar
  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

    if (!hasReference) {
      // No hay foto previa, subirla como referencia
      const formData = new FormData();
      formData.append('photo', file);
      await axios.post(`${backendURL}/upload`, formData);
      setMessage('Foto de referencia guardada.');
      setHasReference(true);
    } else {
      // Comparar con la foto previa
      const inputImage = await faceapi.bufferToImage(file);
      const inputDesc = await getFaceDescriptor(inputImage);

      const reference = await faceapi.fetchImage(`${backendURL}/photo`);
      const referenceDesc = await getFaceDescriptor(reference);

      const distance = faceapi.euclideanDistance(inputDesc, referenceDesc);
      if (distance < 0.5) {
        setMessage(`Coincidencia detectada ✅ (distancia: ${distance.toFixed(2)})`);
      } else {
        setMessage(`No coinciden ❌ (distancia: ${distance.toFixed(2)})`);
      }
    }
  };

  const getFaceDescriptor = async (image) => {
    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('No se detectó rostro en la imagen');
    }

    return detection.descriptor;
  };

  return (
    <div>
      <video ref={videoRef} width="320" height="240" autoPlay muted />
      <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />
      <br />
      <button onClick={startCamera}>Iniciar cámara</button>
      <button onClick={capturePhoto}>Capturar y verificar</button>
      <p>{message}</p>
    </div>
  );
};

export default FaceCapture;
