const CANVA_IMAGES = {
  rural: 'https://design.canva.ai/sfhTo9zgBnAG4zr',
  tuition: 'https://design.canva.ai/lDvz84lyEdGmLJt',
  admissions: 'https://design.canva.ai/WW0Ffa8iBAKaklX',
  seoul: 'https://design.canva.ai/xbg9tjBclYawkEB',
  smartglasses: 'https://design.canva.ai/f5W-WjPb_WiSW5-'
};

module.exports = async (req, res) => {
  const key = String(req.query?.key || '');
  const source = CANVA_IMAGES[key];

  if (!source) {
    res.status(404).send('Unknown Canva image');
    return;
  }

  try {
    const response = await fetch(source, {
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      res.status(502).send('Canva image unavailable');
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      res.status(502).send('Unexpected Canva response');
      return;
    }

    const body = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (error) {
    console.error('Canva image proxy error:', error);
    res.status(502).send('Canva image unavailable');
  }
};
