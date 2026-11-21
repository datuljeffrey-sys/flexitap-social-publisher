import { uploadLocalImageToImgBB, generateOfficialLaunchCopy, publishToBuffer } from './publish_official_release.mjs';

async function run() {
  console.log('==================================================');
  console.log('🚀 FLEXITAP POS: OFFICIAL RELEASE BROADCAST');
  console.log('   "Windows and Android now ready for download"');
  console.log('==================================================\n');

  const localImagePath = 'C:\\Users\\JAY\\.gemini\\antigravity\\brain\\1dbb7ea2-5104-4515-810f-8bb5e8f135bf\\flexitap_pos_launch_v2_1795273631056.jpg';

  // 1. Hosted launch graphic on CDN
  const cdnUrl = 'https://i.ibb.co/jPG0DDqt/60bf5d963e51.jpg';
  console.log(`✅ Hosted Image CDN URL: ${cdnUrl}\n`);

  // 2. Generate Launch Copy
  const copyData = await generateOfficialLaunchCopy();

  console.log('📝 PREVIEW OF VERIFIED COPY:');
  console.log('--------------------------------------------------');
  console.log(`[TWITTER / X (${copyData.twitter_text.length} chars)]:`);
  console.log(copyData.twitter_text);
  console.log('\n[FACEBOOK SAMPLE]:');
  console.log(copyData.facebook_text.slice(0, 320) + '...\n');
  console.log('[LINKEDIN SAMPLE]:');
  console.log(copyData.linkedin_text.slice(0, 320) + '...\n');
  console.log('--------------------------------------------------\n');

  // 3. Publish to Buffer
  console.log('🚀 Publishing to connected Buffer channels...');
  const publishedCount = await publishToBuffer(copyData, cdnUrl);

  console.log(`\n🎉 Successfully published to ${publishedCount} channel(s)!`);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
