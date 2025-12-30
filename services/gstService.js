
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const GST_API_URL = 'https://gst-verification.p.rapidapi.com/v3/tasks/sync/verify_with_source/ind_gst_certificate';
const RAPIDAPI_KEY = 'f5c6d3af1amsh2b837a1bf587158p18e808jsn5787df1330a4';
const RAPIDAPI_HOST = 'gst-verification.p.rapidapi.com';

function cleanGST(gstNumber) {
  return gstNumber.replace(/\s|-/g, '').toUpperCase();
}

function parseGSTApiResponse(data, gstNumber) {
  // Try to extract business details from various possible formats
  let gstData = null;
  if (data.result && data.result.source_output) {
    gstData = data.result.source_output;
  } else if (data.result && data.result.extraction_output) {
    gstData = data.result.extraction_output;
  } else if (data.success && data.data && data.data.legal_name) {
    gstData = data.data;
  } else if (data.legal_name || data.trade_name || data.legalName || data.business_name) {
    gstData = data;
  } else if (data.data && (data.data.legal_name || data.data.business_name)) {
    gstData = data.data;
  } else if (data.status === 'completed' && data.result) {
    gstData = data.result;
  } else if (data.gstin) {
    gstData = data.gstin;
  }

  if (gstData) {
    // Try to extract address
    let formattedAddress = 'Address not available';
    if (gstData.principal_place_of_business_fields?.principal_place_of_business_address) {
      const addr = gstData.principal_place_of_business_fields.principal_place_of_business_address;
      const addressParts = [
        addr.door_number,
        addr.street,
        addr.location,
        addr.dst,
        addr.state_name,
        addr.pincode
      ].filter(Boolean);
      formattedAddress = addressParts.join(', ');
    } else if (gstData.address) {
      formattedAddress = gstData.address;
    }

    return {
      isValid: true,
      gstNumber,
      businessName: gstData.trade_name || gstData.tradeName || gstData.legal_name || gstData.legalName || '', // Firm Name
      ownerName: gstData.legal_name || gstData.legalName || gstData.trade_name || gstData.tradeName || '', // Owner Name
      constitution: gstData.constitution_of_business || gstData.constitution || gstData.constitutionOfBusiness || gstData.entity_type || '',
      address: formattedAddress,
      status: gstData.gstin_status || gstData.status || gstData.sts || gstData.taxpayer_status || 'Active',
      registrationDate: gstData.date_of_registration || gstData.registrationDate || gstData.rgdt || gstData.registration_date || '',
      stateJurisdiction: gstData.state_jurisdiction || gstData.state || gstData.stateJurisdiction || gstData.stj || gstData.state_code || '',
      streetAddress: gstData.principal_place_of_business_fields?.principal_place_of_business_address?.door_number || '',
      city: gstData.principal_place_of_business_fields?.principal_place_of_business_address?.street || gstData.principal_place_of_business_fields?.principal_place_of_business_address?.location || gstData.principal_place_of_business_fields?.principal_place_of_business_address?.dst || '',
      state: gstData.principal_place_of_business_fields?.principal_place_of_business_address?.state_name || '',
      pincode: gstData.principal_place_of_business_fields?.principal_place_of_business_address?.pincode || '',
      raw: data,
    };
  }
  return {
    isValid: false,
    error: 'No recognizable business profile data found',
    raw: data,
  };
}

async function verifyGSTNumber(gstNumber) {
  const clean = cleanGST(gstNumber);
  const taskId = uuidv4();
  const groupId = uuidv4();
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_id: taskId,
      group_id: groupId,
      data: { gstin: clean },
    }),
  };

  try {
    const response = await fetch(GST_API_URL, options);
    const result = await response.json();
    console.log('GST API response:', JSON.stringify(result, null, 2));
    if (response.ok) {
      return parseGSTApiResponse(result, clean);
    } else {
      return {
        isValid: false,
        error: result.message || 'Invalid GST number',
        raw: result,
      };
    }
  } catch (error) {
    console.error('GST verification error:', error);
    return {
      isValid: false,
      error: error.message || 'GST verification failed',
    };
  }
}

module.exports = { verifyGSTNumber };
