(async () => {
  try {
    console.log('Sending test 1 with {1}, {2}, {3}...');
    const params1 = new URLSearchParams();
    params1.append('appkey', 'f67908d5-5aa9-49d9-8c56-9572272ea6d0');
    params1.append('authkey', 'ppIYRYOlXVAd41QhiCDu6scku4jfJG0vTVBuLpsj395dXCT8wj');
    params1.append('to', '917999416330');
    params1.append('template_id', 'recipt');
    params1.append('language', 'en');
    params1.append('file', 'https://dnyansagarclasses.rhaitech.online/uploads/invoice-367.png');
    params1.append('variables[{1}]', 'Mayu');
    params1.append('variables[{2}]', '5,000');
    params1.append('variables[{3}]', '45,000');

    const res1 = await fetch('https://api.rhaitech.online/api/create-message', {
      method: 'POST',
      body: params1
    });
    console.log('Test 1 Response:', await res1.text());

    console.log('Sending test 2 with {variableKey1}, {variableKey2}, {variableKey3}...');
    const params2 = new URLSearchParams();
    params2.append('appkey', 'f67908d5-5aa9-49d9-8c56-9572272ea6d0');
    params2.append('authkey', 'ppIYRYOlXVAd41QhiCDu6scku4jfJG0vTVBuLpsj395dXCT8wj');
    params2.append('to', '917999416330');
    params2.append('template_id', 'recipt');
    params2.append('language', 'en');
    params2.append('file', 'https://dnyansagarclasses.rhaitech.online/uploads/invoice-367.png');
    params2.append('variables[{variableKey1}]', 'Mayu');
    params2.append('variables[{variableKey2}]', '5,000');
    params2.append('variables[{variableKey3}]', '45,000');

    const res2 = await fetch('https://api.rhaitech.online/api/create-message', {
      method: 'POST',
      body: params2
    });
    console.log('Test 2 Response:', await res2.text());

  } catch (err) {
    console.error('Test error:', err);
  }
})();
