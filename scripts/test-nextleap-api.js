const COOKIE =
  'g_state={"i_l":0,"i_ll":1760830812923}; rt=ZXlKaGJHY2lPaUpJVXpVeE1pSjkuZXlKaGRXUWlPaUp1WlhoMGJHVmhjQzFoY0hBdGNISnZaQ0lzSW5WelpYSmZhV1FpT2lKT1RGVkpSQzAyTW1Rd1lqRTBNQzB4TkdWakxUUXlZell0WVdSaU15MDRaVGhsTVdWaE9HUm1ZamNpTENKaGRYUm9YM1JwYldVaU9pSXhOell3T0RNd09ERTJJaXdpYVhOeklqb2lhSFIwY0hNNkx5OXVaWGgwYkdWaGNDNWhjSEF2YjJGMWRHZ3lJaXdpYzJWemMybHZibDlwWkNJNkltWTBPVEUyTjJVMUxURTJNRGd0Tkdaak1DMWhOVGt5TFdKak1XWmpNVFU0WW1ReVpDMHhOall3T0RNd09ERTJNRGszSWl3aVpYaHdJam9pTVRjM05qTTRNamd4TmlJc0luUnZhMlZ1WDNSNWNHVWlPaUp5ZENJc0ltbGhkQ0k2SWpFM05qQTRNekE0TVRZaUxDSmxiV0ZwYkNJNkluTjFlV0Z6YUcxaGJtdGhja0JuYldGcGJDNWpiMjBpZlEuLUhkR0g0YzdXbHpNdlZhWnQxbjJ3YWpjQmlUWjljVzZfa1lPZS1tbDhCWTBOaFFQbHV1WG4yOW45Tk92OExxUVFHSFB6N2YzWnYtRmRDazVKUkZXY0E=; at=ZXlKaGJHY2lPaUpJVXpVeE1pSjkuZXlKaGRXUWlPaUp1WlhoMGJHVmhjQzFoY0hBdGNISnZaQ0lzSW5WelpYSmZhV1FpT2lKT1RGVkpSQzAyTW1Rd1lqRTBNQzB4TkdWakxUUXlZell0WVdSaU15MDRaVGhsTVdWaE9HUm1ZamNpTENKaGRYUm9YM1JwYldVaU9pSXhOall3T0RNME9UWTBJaXdpYVhOeklqb2lhSFIwY0hNNkx5OXVaWGgwYkdWaGNDNWhjSEF2YjJGMWRHZ3lJaXdpYzJWemMybHZibDlwWkNJNkltWTBPVEUyTjJVMUxURTJNRGd0Tkdaak1DMWhOVGt5TFdKak1XWmpNVFU0WW1ReVpDMHhOall3T0RNd09ERTJNRGszSWl3aVpYaHdJam9pTVRjMk1EZ3pPRFUyTkNJc0luUnZhMlZ1WDNSNWNHVWlPaUpoZENJc0ltbGhkQ0k2SWpFM05qQTRNelE1TmpRaUxDSmxiV0ZwYkNJNkluTjFlV0Z6YUcxaGJtdGhja0JuYldGcGJDNWpiMjBpZlEuc3Rhb3dHY1lLYnRsM3ZaY1E3T2tFclRNN2ItTUhXMzRldHc1RzBKalZYd0YwY0FuTFM2Um8xTGdVTWtOVU52TzUyWW1QYm1Wcm9TTzJrTjlnQnZpUlE=; mp_344c114d886ddef572928a792ecc6741_mixpanel=%7B%22distinct_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24device_id%22%3A%20%22199f9b1e173270-0f81309d198416-1e525631-1fa400-199f9b1e173270%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24email%22%3A%20%22suyashmankar%40gmail.com%22%2C%22Whitelist%20Status%22%3A%20%22WAITLISTED%22%7D';

const API_URL = 'https://nextleap.app/api/v1/nebula-service/problem/discussions';

async function testAPI() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        cookie: COOKIE,
        origin: 'https://nextleap.app',
        referer:
          'https://nextleap.app/course-dashboard/nlcfshwyuxi5ksyz8qlk3/interview-prep/questions',
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'x-channel': 'web',
        'x-date-time-format':
          'eyJsb2NhbGUiOiJlbi1VUyIsImNhbGVuZGFyIjoiZ3JlZ29yeSIsIm51bWJlcmluZ1N5c3RlbSI6ImxhdG4iLCJ0aW1lWm9uZSI6IkFzaWEvQ2FsY3V0dGEiLCJ5ZWFyIjoibnVtZXJpYyIsIm1vbnRoIjoibnVtZXJpYyIsImRheSI6Im51bWVyaWMifQ==',
        'x-viewport-info': 'eyJ3aWR0aCI6MTM2OCwiaGVpZ2h0Ijo5OTIsImRwciI6MX0=',
      },
      body: JSON.stringify({
        pageNum: 2,
        pageSize: 20,
        refreshAttemptNum: 0,
        problemTypes: ['PRODUCT'],
        prefixUrl: '/course-dashboard/nlcfshwyuxi5ksyz8qlk3/interview-prep/question',
        totalCount: 1685,
        sortByEngagementScore: true,
      }),
    });

    console.log('Response status:', response.status);
    const data = await response.json();

    console.log('\n=== Full Response ===');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n=== Response Keys ===');
    console.log(Object.keys(data));

    if (data.problems) {
      console.log('\n=== Problems Found ===');
      console.log('Number of problems:', data.problems.length);
      if (data.problems.length > 0) {
        console.log('\n=== First Problem ===');
        console.log(JSON.stringify(data.problems[0], null, 2));
      }
    } else {
      console.log('\n⚠️  No "problems" field in response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
