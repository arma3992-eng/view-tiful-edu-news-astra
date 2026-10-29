const CANVA_IMAGES = {
  rural: 'https://media.canva.com/v2/document-image/hash:-858231996/height:335/id:DAHZYHM02sI/type:B/width:596?brand=BAHZUUXHLWI&csig=AAAAAAAAAAAAAAAAAAAAANAMJcZgUw_8elIBj_uIW94wKr2Dt7gKN3TXOMLZ2orX&exp=1793269288&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FM02sI%2FDAHZYHM02sI%2F2%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261029%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261029T075126Z%26X-Amz-Expires%3D6842%26X-Amz-Signature%3Dfe64cd2da7fa1f6df7cff7c463d4b2ad584064596f95e7d70c21f2ca147ad419%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DThu%252C%252029%2520Oct%25202026%252009%253A45%253A28%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAAlaTrtD8CbGiNmC8Yt4cRjKBTVL2w-GmiKx5ob3DE1G&page=1&signed=brand%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=2',
  tuition: 'https://media.canva.com/v2/document-image/hash:1788095817/height:335/id:DAHZYDwDC9M/type:B/width:596?brand=BAHZUUXHLWI&csig=AAAAAAAAAAAAAAAAAAAAAI4kEOsU2txsoSp1MRToOsbSNNBzgJeWWhN0hcw-tsiI&exp=1793269490&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FwDC9M%2FDAHZYDwDC9M%2F2%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261028%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261028T204334Z%26X-Amz-Expires%3D46295%26X-Amz-Signature%3D0e771e59bedd4b1a5753fc35fbe387cedac609c90d74e8b4ee704264e33ea4ef%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DThu%252C%252029%2520Oct%25202026%252009%253A35%253A09%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAACapbufc-21nNBZoz19s87oJRglVvMHk-t1BSiSKbNz0&page=1&signed=brand%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=2',
  admissions: 'https://media.canva.com/v2/document-image/hash:820917204/height:335/id:DAHZYEZDx_w/type:B/width:596?brand=BAHZUUXHLWI&csig=AAAAAAAAAAAAAAAAAAAAAJ3TwTcMCXnxgF5N5zQc9Ri7aOWNV2NT5KF-p4JAYIcm&exp=1793268429&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FZDx_w%2FDAHZYEZDx_w%2F2%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261028%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261028T180637Z%26X-Amz-Expires%3D58402%26X-Amz-Signature%3D13f08884da766cd0ed1a070ec4342675fc63322642892a5476994ce55e29a0ab%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DThu%252C%252029%2520Oct%25202026%252010%253A19%253A59%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAE_SdSaq9Dz8BDgjqg_4yIahwDqfbGJeEDpsdvfuWEnz&page=1&signed=brand%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=2',
  seoul: 'https://media.canva.com/v2/document-image/hash:225764367/height:335/id:DAHZYEdacl0/type:B/width:596?brand=BAHZUUXHLWI&csig=AAAAAAAAAAAAAAAAAAAAAKz7F-sy6yCvse2Ff92GdHjl04Qzqc6Wf3BsBl7RTnwi&exp=1793266921&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2Fdacl0%2FDAHZYEdacl0%2F2%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261028%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261028T213906Z%26X-Amz-Expires%3D44728%26X-Amz-Signature%3D7a68655451053e464bae06908aaf5b9f08d37b68c45e2193acd1e0ded7452379%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DThu%252C%252029%2520Oct%25202026%252010%253A04%253A34%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAKKlHoFpgTJfhck-EQHW-Hj85RLnDk-VEed8ww1P4QoL&page=1&signed=brand%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=2',
  smartglasses: 'https://media.canva.com/v2/document-image/hash:1322506464/height:335/id:DAHZYKnaTyg/type:B/width:596?brand=BAHZUUXHLWI&csig=AAAAAAAAAAAAAAAAAAAAAHdB13FTJzxbYFOyDLpJogf7NoNvY_pFLelwZcPmzMrW&exp=1793267299&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FnaTyg%2FDAHZYKnaTyg%2F2%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUHW27RK5IK%252F20261028%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20261028T084518Z%26X-Amz-Expires%3D90593%26X-Amz-Signature%3Dcbcb3a5d53223b87853fecb479a025881d0bc6b023a7ad2b42d92e2c1fbf4872%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DThu%252C%252029%2520Oct%25202026%252009%253A55%253A11%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAJ5wjC-zmC-C730JWRLiR8HJSp1bcSza0EfPVk6Qfhh3&page=1&signed=brand%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=2'
};

module.exports = async (req, res) => {
  const key = String(req.query?.key || '');
  const source = CANVA_IMAGES[key];

  if (!source) {
    res.status(404).json({ error: 'Unknown Canva image' });
    return;
  }

  try {
    const response = await fetch(source, { redirect: 'follow' });
    if (!response.ok) {
      res.status(502).json({ error: 'Canva image unavailable', status: response.status });
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const body = Buffer.from(await response.arrayBuffer());

    if (req.query?.format === 'base64') {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ key, contentType, base64: body.toString('base64') });
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (error) {
    console.error('Canva image proxy error:', error);
    res.status(502).json({ error: 'Canva image unavailable' });
  }
};
