use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;
use hex::encode;
use crate::errors::ErrorCode;


pub fn verify_certificate(
    expected_signer: &Pubkey,
    expected_message: &[u8],
    certificate: Vec<u8>,  // Change here to Vec<u8>
) -> Result<()> {
    let certificate_hex = encode(&certificate);
    let expected_signer_hex = encode(expected_signer.to_bytes());
    let expected_message_hex = encode(expected_message);

    msg!("🔹 Certificate (Hex): {}", certificate_hex);
    msg!("🔹 Expected Signer (Hex): {}", expected_signer_hex);
    msg!("🔹 Expected Message (Hex): {}", expected_message_hex);

    // Extract the signer (bytes 33-96)
    let signer: &str = &certificate_hex[32..96];  

    // Extract the signed message (bytes 224-330)
    let message: &str = &certificate_hex[224..330];

    msg!("🔹 Extracted Signer: {}", signer);
    msg!("🔹 Extracted Message: {}", message);

    // Verify that the extracted signer and message match the expected values
    if expected_signer_hex == signer && expected_message_hex == message {
        msg!("✅ Certificate verification passed!");
        return Ok(());
    } else {
        msg!("❌ Certificate verification failed!");
        return Err(ErrorCode::InvalidInstructionData.into());
    }
}
