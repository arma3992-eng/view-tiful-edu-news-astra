'use strict';
(() => {
  const renderedBySource = {
    'https://design.canva.ai/sfhTo9zgBnAG4zr': 'https://storage.googleapis.com/firecrawl-scrape-media/screenshot-589f587a-fd68-4301-bd15-fa99dbd1162b.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1793867529&Signature=QfGsHAIXoUsYgdmuIOIVP4zXs8urAsWNw1%2Bv0jl%2FVxbo%2BA3CKPj3bt1Fbv36Y1nvhSx%2FRFyaNuoLyONuJqaNzcR7ILvsMo83VoniSUzHVHqSy6Ca7wF9xWONsYwa7EUHInzXw1ddPyYeaCXNONVvgkqI2h%2FR4TGUWhX9MAwEFHpby7SeA8ktX28f8pPGA4puHV0yUxPCh4XaCAr4QrdJKcs9QKjgXchzR7Scw%2FY7spz3YLyfv1Sf52Yrj%2BYE9OOmj3q297s76Qr%2FSKwaBpoxjdNjI0QczLHnXInge%2FdcXTqUMPSna4eeo%2BO1nZp%2FXZiy3Ux8SV%2BkZgnWebZVQGq9vA%3D%3D',
    'https://design.canva.ai/lDvz84lyEdGmLJt': 'https://storage.googleapis.com/firecrawl-scrape-media/screenshot-05c3f01b-9ff8-4177-8830-751d20709151.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1793867552&Signature=S7IYqRZUdTwBDsYdDDAbPCP%2BFb1Fve1ucrEMkSMPuBuS14MbaFrPgUU9uk%2F8pxcbXln%2FJ3ITRCTv11nI3OxWs66zD55Jo2FntS%2FvqfbRGlvs4cY6VIfWUtjErAvsfvQk7Xf4OyquMVj%2Ftsc3nGdXAprRiDlhpe6OhssgJc0uyOhiS1h3Yo0lFh6coLf%2BzovXOE81vCz4oaDjRDtaygJXFoa3%2F1AvxOouvFScb1RfUTgOfjy4GXTMLyAZlHDIn9bHlJIzFlLXTpQnyQcjSM3pSeLHUdfjLpDBFFbBCJ%2FeFlWQEHcS24bDU2SVreFq%2B0Cc%2Bs2cK9%2BjLTylOOig02kH5Q%3D%3D',
    'https://design.canva.ai/WW0Ffa8iBAKaklX': 'https://storage.googleapis.com/firecrawl-scrape-media/screenshot-e3b4938f-38db-42eb-86f2-6390a1f5325e.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1793867559&Signature=SGDHTVgCDTv6yQ4mHLTVh19zZMRi8xoN9HwY2Ibjhv6QOOjoFSWP%2FJgnxzSPHHG1Ty8%2F9Z9tmRyFGeRGI1rDSvylW%2F4YK3YvFWq3bXtvYOyQmt6hrh1qBe%2B6JKZ4rV8nNDJQ2kaCjzcPIPNvn9cjEkcRjFv2Ob%2BmUkRxzvDP7Bsk2aKPLMXzuHSBBjb8yoig6fPqfya%2F%2FmXUg9CXKyMXjN7RdFfq%2BFSx28ctsoeYQ0zHMcihUeEn1lGHU26xzDy67jdou0nbQhIC9iO8JKxz7rCRSr8NtDYAfsSBUVJ%2FeMCmRM%2Fo%2Fg4RenkwNrVB6BW76F4Dvfqkoo%2Fvli8YzmjwgA%3D%3D',
    'https://design.canva.ai/xbg9tjBclYawkEB': 'https://storage.googleapis.com/firecrawl-scrape-media/screenshot-478dd401-2431-4ab3-805e-bce39062c2dc.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1793867564&Signature=WMUm0wYpxp1Laa9DhAtxDWxZ6w0eClwEMMkMbAuraBMgd9olJHTA8dLnvViQraIxl93TqEAF6fbCOgTI4%2BWLxqDwupAYHLR9UQO5EFDum6LsjM0ktvsBogZTlORh%2ByJH2dL4l7lwka9u1vbhonn%2BEwrivfCaTWxLs20A0rqS%2BttnGdOKjYVcbj%2FhgPWnLR9FBnP53uq2TgoAOPN9dd%2B%2FHaag1CtxF%2BDduMpuNGnbUBt7kFN3wVqMfDA1WFG2QVnLV7XV9rE1%2FKFbM3GCKlWMFGSHSEPJMfcBjODF%2Byzy7YEvfYBx8KNTD4I9AZa%2Fh9emi6l1l9KVwjZfVJSmovBFcg%3D%3D',
    'https://design.canva.ai/f5W-WjPb_WiSW5-': 'https://storage.googleapis.com/firecrawl-scrape-media/screenshot-8b2687e7-5ab7-41c4-ab71-2e4709253119.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1793867571&Signature=KMT9eYwpRYt1bCMoPXAbLptc03X%2FZGhNyWyFi6m53H28T55335gvxEosxymh4BPqYgXMMxZBx45rhQ%2BaZFLIS44g%2FjbTNORRNBMoPFHmMz9PEH6GTNuH9ca6b%2FnJtgoBEheke7dYRDR6gk9Ah5J%2FYylMHVG7O9IAWnAnG1Hea3Kt3XS5zIqBt9sM8U5zLUNJBVxKlQ6ZZK6uJr2MP6%2FVc1Egy%2FYVpzogLdLk4b0pcGbNszdoHNgo0QI%2BoJexBmML6VFjpEj4sE6DF1r%2BWuN9px%2FTGittEh7XcQdIQm6FA%2Bnr0i7T3i5nif1rpgVfqWcrolrkhOU6dznEGtRgp3eXwg%3D%3D'
  };

  for (const story of window.ARCHIVE_ARTICLES || []) {
    const rendered = renderedBySource[story.canvaImage];
    if (rendered) story.canvaImage = rendered;

    if (story.id === 'school-policy-tuition-review-transparency-20261028') {
      story.category = window.CATEGORY_NEWS?.['school-policy']?.title || '학교·교육정책';
      story.readingLabel = '학교·교육정책 · 4분 읽기';
    }
  }
})();
