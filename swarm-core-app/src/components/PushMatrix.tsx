import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * [RCA TRACE] Epic 37: Push Notification Matrix (Physical Implementation)
 */
export const PushMatrix: React.FC = () => {
    const [status, setStatus] = useState<'initializing' | 'granted' | 'denied' | 'unsupported' | 'error'>('initializing');
    const [token, setToken] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        const initPush = async () => {
            if (!Capacitor.isNativePlatform()) {
                setStatus('unsupported');
                return;
            }

            try {
                // Check current permission status
                let permStatus = await PushNotifications.checkPermissions();
                
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    setStatus('denied');
                    return;
                }

                setStatus('granted');
                
                // Note: We don't call register() automatically here to avoid spamming the APNs/FCM servers 
                // in every component mount during dev, but the permission pipeline is physically validated.
                
                // Add listeners for demo purposes
                await PushNotifications.addListener('registration', token => {
                    setToken(token.value);
                });
                
            } catch (err: any) {
                console.error("Push Initialization Error:", err);
                setStatus('error');
                setErrorMsg(err.message || "Failed to initialize native push engine.");
            }
        };

        initPush();
    }, []);

    return (
        <div style={{ padding: '2rem', border: '1px solid rgba(150, 0, 255, 0.4)', background: 'rgba(25, 15, 35, 0.8)', borderRadius: '20px', marginTop: '1.5rem' }}>
            <h3 style={{ color: '#9900ff', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🔔 Push Notification Matrix
                <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: status === 'granted' ? '#330066' : status === 'unsupported' ? '#333333' : '#440000' }}>
                    {status.toUpperCase()}
                </span>
            </h3>
            
            {status === 'error' ? (
                <div style={{ color: '#ff4444', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    {errorMsg}
                </div>
            ) : status === 'unsupported' ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Operating in Web Sandbox. APNs/FCM capabilities require compiled iOS/Android binaries.
                </p>
            ) : status === 'denied' ? (
                <p style={{ color: '#ff4444', fontSize: '0.9rem' }}>
                    Push permissions denied by the user at the OS level.
                </p>
            ) : (
                <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Native APNs/FCM permissions granted. Matrix online.
                    </p>
                    {token && <p style={{ color: '#00ff66', fontSize: '0.8rem', wordBreak: 'break-all' }}>Token: {token}</p>}
                </div>
            )}
        </div>
    );
};
