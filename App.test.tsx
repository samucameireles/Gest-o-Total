
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Simple test component
function TestDashboard() {
    return (
        <div style={{ padding: '50px', fontSize: '24px', background: '#f0f0f0', minHeight: '100vh' }}>
            <h1>Dashboard Test - Se você está vendo isso, o React está funcionando!</h1>
            <p>Tenant ID da URL: {window.location.pathname}</p>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="*" element={<TestDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}
