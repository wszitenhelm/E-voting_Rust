use anchor_lang::prelude::*;
use solana_program::{
    account_info::AccountInfo, pubkey::Pubkey, sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID}
};
use hex::encode;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct VerifySignature<'info> {
    /// CHECK: Instructions Sysvar for inspecting transaction
    #[account(address = SYSVAR_INSTRUCTIONS_ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn verify_signature(
    ctx: Context<VerifySignature>,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    let instruction_sysvar = &ctx.accounts.instructions;
    let instruction_data = instruction_sysvar.try_borrow_data()?;
    let total_instructions = instruction_data.len() / 4; // Each instruction index is 4 bytes

    msg!("🔹 Total Instructions: {}", total_instructions);

    let expected_message_hex = encode(expected_message);
    let expected_signer_hex = encode(expected_signer);

    // Debugging output for expected values
    msg!("🔹 Expected message: {:?}", expected_message);
    msg!("🔹 Expected message (hex): {:?}", expected_message_hex);
    msg!("🔹 Expected signer: {:?}", expected_signer);
    msg!("🔹 Expected signer (hex): {:?}", expected_signer_hex);

    // Iterate through the instructions to find a match
    for i in 0..total_instructions {
        if let Ok(ix) = load_instruction_at_checked(i as usize, instruction_sysvar) {
            msg!("🔹 Instruction {}: {:?}", i, ix);
            msg!("🔹 Instruction {} (Hex): {}", i, encode(&ix.data));

            let instruction_hex = encode(&ix.data);
            
            // Ensure that instruction is long enough before trying to slice it
            if instruction_hex.len() >= 330 {
                let signer: &str = &instruction_hex[32..96]; // Bytes 33-96 (128 hex chars)
                let message: &str = &instruction_hex[224..330]; // Bytes 225-330 (128 hex chars)

                // Check if the expected signer and message match
                if expected_message_hex == message && expected_signer_hex == signer {
                    msg!("✅ Signature verification passed.");
                    return Ok(());
                }
            } else {
                msg!("❌ Instruction too short to contain valid signer/message data.");
            }
        } else {
            msg!("❌ Failed to load instruction at index {}", i);
        }
    }

    msg!("❌ No valid Ed25519 instruction found matching the expected signer and message.");
    Err(ErrorCode::InvalidInstructionData.into())
}
