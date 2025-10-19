async function quickTest() {
  try {
    const response = await fetch('https://nextleap.app/api/v1/nebula-service/problem/discussions', {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        cookie:
          'mp_344c114d886ddef572928a792ecc6741_mixpanel=%7B%22distinct_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24device_id%22%3A%20%22199f9b1e173270-0f81309d198416-1e525631-1fa400-199f9b1e173270%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24email%22%3A%20%22suyashmankar%40gmail.com%22%2C%22Whitelist%20Status%22%3A%20%22WAITLISTED%22%7D',
      },
      body: JSON.stringify({
        pageNum: 1,
        pageSize: 5,
        refreshAttemptNum: 0,
        problemTypes: ['PRODUCT'],
        prefixUrl: '/course-dashboard/nlcfshwyuxi5ksyz8qlk3/interview-prep/question',
        totalCount: 1685,
        sortByEngagementScore: true,
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();

    if (data.problems && data.problems.length > 0) {
      console.log('✅ SUCCESS! Found', data.problems.length, 'problems');
      console.log('\nFirst problem:');
      console.log('- Title:', data.problems[0].title?.text);
      console.log('- Category:', data.problems[0].tags?.[0]?.text?.text);
      console.log('- Companies:', data.problems[0].bottomTags?.map(t => t.text?.text).join(', '));
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickTest();
