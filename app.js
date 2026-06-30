const POIDH_URL = 'https://poidh.xyz/base/bounty/1249';
const ZABAL_CHANNEL_URL = 'https://farcaster.xyz/~/channel/zabal';
const ZABAL_GAMEZ_URL = 'https://zabalgamez.com';
const ZABAL_REPO_URL = 'https://github.com/ZAODEVZ/zabalgames';
const STORAGE_KEY = 'proof-drop-zabal:last-receipt';

let selectedTrack = 'builder';
let proofPhoto = {
  fileName: '',
  contentType: '',
  sizeBytes: 0,
  lastModified: '',
  sha256: '',
};
let receipt = null;

const $ = (id) => document.getElementById(id);

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Bytes(data) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return hex(digest);
}

async function sha256Json(payload) {
  return sha256Bytes(new TextEncoder().encode(stableStringify(payload)));
}

function cleanHandle(value, fallback) {
  return (value || fallback).trim().replace(/^@/, '') || fallback;
}

function field(id) {
  return $(id).value.trim();
}

function buildPost(channel) {
  const buildTitle = field('buildTitle') || 'Proof Drop for ZABAL Gamez';
  const buildUrl = field('buildUrl') || 'https://proof-drop-zabal.pages.dev';
  const repoUrl = field('repoUrl');
  const hash = receipt?.receiptHash ? `sha256:${receipt.receiptHash}` : 'sha256:pending';
  const repoLine = repoUrl ? `Repo: ${repoUrl}\n` : '';

  if (channel === 'x') {
    return `I shipped ${buildTitle} for ZABAL Gamez July open build month.\n\nBuild: ${buildUrl}\n${repoLine}Receipt: ${hash}\n\n@bettercallzaal`;
  }

  return `I shipped ${buildTitle} for /zabal.\n\nBuild: ${buildUrl}\n${repoLine}Receipt: ${hash}\n\nPOIDH claim page: ${POIDH_URL}`;
}

function buildPayload(createdAt = new Date().toISOString()) {
  return {
    app: 'Proof Drop for ZABAL',
    schema: 'dreamnet.proofdrop.zabal_build_receipt.v1',
    createdAt,
    event: {
      name: 'ZABAL Gamez Season 1',
      phase: 'July open build month',
      bounty: POIDH_URL,
      channel: ZABAL_CHANNEL_URL,
      eventSite: ZABAL_GAMEZ_URL,
      eventRepo: ZABAL_REPO_URL,
      deadline: '2026-07-31T23:59:00-07:00',
    },
    builder: {
      farcaster: cleanHandle(field('farcasterHandle'), 'ghostmintops'),
      x: cleanHandle(field('xHandle'), 'ghostmintops'),
      wallet: field('walletAddress') || null,
    },
    build: {
      title: field('buildTitle') || 'Untitled ZABAL Gamez build',
      track: selectedTrack,
      liveUrl: field('buildUrl') || 'https://proof-drop-zabal.pages.dev',
      repoUrl: field('repoUrl') || null,
    },
    proofPhoto: proofPhoto.sha256
      ? proofPhoto
      : {
          status: 'not_attached_yet',
          instruction: 'Add the POIDH proof photo file to bind its SHA-256 into this receipt.',
        },
    checklist: {
      shippedLinkableBuild: Boolean(field('buildUrl')),
      openSourceRepo: Boolean(field('repoUrl')),
      attachedProofPhotoHash: Boolean(proofPhoto.sha256),
      tagBetterCallZaalOnX: false,
      crossPostInZabalChannel: false,
      submitClaimOnPoidh: false,
    },
    generatedText: {
      x: buildPost('x'),
      farcaster: buildPost('farcaster'),
    },
  };
}

function updateChecklist() {
  $('buildCheck').classList.toggle('done', Boolean(field('buildUrl')));
  $('repoCheck').classList.toggle('done', Boolean(field('repoUrl')));
  $('photoCheck').classList.toggle('done', Boolean(proofPhoto.sha256));
  $('receiptCheck').classList.toggle('done', Boolean(receipt?.receiptHash));
  $('seal').textContent = receipt?.receiptHash ? 'STAMPED' : 'READY';
}

function renderReceipt() {
  $('xPost').value = buildPost('x');
  $('farcasterPost').value = buildPost('farcaster');
  $('receiptJson').textContent = receipt ? JSON.stringify(receipt, null, 2) : '';
  $('shortHash').textContent = receipt?.receiptHash
    ? `sha256:${receipt.receiptHash.slice(0, 14)}...${receipt.receiptHash.slice(-8)}`
    : 'pending';
  updateChecklist();
}

async function stampReceipt() {
  const payload = buildPayload();
  const receiptHash = await sha256Json(payload);
  receipt = { ...payload, receiptHash };
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      fields: {
        buildTitle: field('buildTitle'),
        buildUrl: field('buildUrl'),
        repoUrl: field('repoUrl'),
        farcasterHandle: field('farcasterHandle'),
        xHandle: field('xHandle'),
        walletAddress: field('walletAddress'),
      },
      selectedTrack,
      proofPhoto,
      receipt,
    }),
  );
  $('status').textContent = proofPhoto.sha256
    ? 'ZABAL claim kit stamped. Copy a post, open POIDH, and submit the proof photo.'
    : 'Receipt stamped. Add the proof photo hash before the final POIDH claim.';
  renderReceipt();
}

async function verifyReceipt() {
  if (!receipt) {
    $('status').textContent = 'Stamp a receipt first.';
    return;
  }
  const expected = receipt.receiptHash;
  const payload = { ...receipt };
  delete payload.receiptHash;
  const actual = await sha256Json(payload);
  $('status').textContent =
    actual === expected
      ? 'Receipt verified. The visible payload still matches the hash.'
      : 'Receipt mismatch. Something changed after the hash was created.';
}

async function copyText(label, text) {
  await navigator.clipboard.writeText(text);
  $('status').textContent = `${label} copied.`;
}

function downloadReceipt() {
  if (!receipt) return;
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'proof-drop-zabal-receipt.json';
  link.click();
  URL.revokeObjectURL(url);
}

function openCast() {
  const text = encodeURIComponent(buildPost('farcaster'));
  const embed = encodeURIComponent(field('buildUrl') || 'https://proof-drop-zabal.pages.dev');
  window.open(`https://farcaster.xyz/~/compose?text=${text}&embeds[]=${embed}`, '_blank', 'noopener,noreferrer');
}

async function handlePhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  proofPhoto = {
    fileName: file.name,
    contentType: file.type || 'unknown',
    sizeBytes: file.size,
    lastModified: new Date(file.lastModified).toISOString(),
    sha256: await sha256Bytes(await file.arrayBuffer()),
  };
  $('photoStatus').textContent = `${proofPhoto.fileName} hashed as sha256:${proofPhoto.sha256.slice(0, 16)}...${proofPhoto.sha256.slice(-8)}`;
  $('status').textContent = 'Proof photo hashed locally. The image stays with you until you submit it on POIDH.';
  await stampReceipt();
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return;
    Object.entries(saved.fields || {}).forEach(([key, value]) => {
      if ($(key) && value) $(key).value = value;
    });
    selectedTrack = saved.selectedTrack || selectedTrack;
    proofPhoto = saved.proofPhoto || proofPhoto;
    receipt = saved.receipt || receipt;
    document.querySelectorAll('[data-track]').forEach((button) => {
      button.classList.toggle('active', button.dataset.track === selectedTrack);
    });
    if (proofPhoto.sha256) {
      $('photoStatus').textContent = `${proofPhoto.fileName} hashed as sha256:${proofPhoto.sha256.slice(0, 16)}...${proofPhoto.sha256.slice(-8)}`;
    }
    $('status').textContent = receipt ? 'Previous claim kit loaded from this browser.' : 'Ready.';
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

document.querySelectorAll('[data-track]').forEach((button) => {
  button.addEventListener('click', async () => {
    selectedTrack = button.dataset.track;
    document.querySelectorAll('[data-track]').forEach((item) => item.classList.toggle('active', item === button));
    await stampReceipt();
  });
});

['buildTitle', 'buildUrl', 'repoUrl', 'farcasterHandle', 'xHandle', 'walletAddress'].forEach((id) => {
  $(id).addEventListener('input', () => {
    renderReceipt();
    updateChecklist();
  });
});

$('proofPhoto').addEventListener('change', handlePhoto);
$('stampButton').addEventListener('click', stampReceipt);
$('verifyButton').addEventListener('click', verifyReceipt);
$('copyXButton').addEventListener('click', () => copyText('X post', buildPost('x')));
$('copyFarcasterButton').addEventListener('click', () => copyText('/zabal post', buildPost('farcaster')));
$('copyJsonButton').addEventListener('click', async () => {
  if (!receipt) await stampReceipt();
  await copyText('Receipt JSON', JSON.stringify(receipt, null, 2));
});
$('downloadButton').addEventListener('click', downloadReceipt);
$('castButton').addEventListener('click', openCast);

restore();
stampReceipt();
