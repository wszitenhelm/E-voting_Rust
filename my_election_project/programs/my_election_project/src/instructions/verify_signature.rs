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
    //accounts: &[AccountInfo],
    ctx: Context<VerifySignature>,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    // msg!("Starting signature verification...");

    // msg!("🔹 VERIFY_SIGANTURE");
    // msg!("🔹 messege expected {:?}", expected_message);
    // msg!("🔹 messege expected hex {:?}", hex::encode(expected_message));

    // msg!("🔹 signer expected {:?}", expected_signer);
    // msg!("🔹 signer expected hex {:?}", hex::encode(expected_signer));


    let instruction_sysvar = &ctx.accounts.instructions;
    let instruction_data = instruction_sysvar.try_borrow_data()?;
    let total_instructions = instruction_data.len() / 4; // Each instruction index is 4 bytes

    msg!("🔹 Total Instructions: {}", total_instructions);

    let expected_message_hex = encode(expected_message);
    let expected_signer_hex = encode(expected_signer);

    msg!("🔹 messege expected {:?}", expected_message);
    msg!("🔹 messege expected hex {:?}", expected_message_hex);

    msg!("🔹 signer expected {:?}", expected_signer);
    msg!("🔹 signer expected hex {:?}",expected_signer_hex);

    for i in 0..total_instructions {
        if let Ok(ix) = load_instruction_at_checked(i as usize, instruction_sysvar) {
            msg!("🔹 Instruction {}: {:?}", i, ix);
            msg!("🔹 Instruction {} (Hex): {}", i, encode(&ix.data));
            let instruction_hex = encode(&ix.data);
            // OPTIMIZE SO IT DOESN'T CHECK ALL INSTRUCTIONS! instruction lenght ?
            if instruction_hex.contains(&expected_message_hex) && instruction_hex.contains(&expected_signer_hex) {
                //let first_32: String = instruction_hex.chars().take(32).collect(); // Each byte is represented by 2 hex characters
                //let first_32: &str = &instruction_hex[..32]; // First 32 bytes (64 hex chars)
                let signer: &str = &instruction_hex[32..96]; // Bytes 33-96 (128 hex chars)
                let message: &str = &instruction_hex[224..330]; // Bytes 33-96 (128 hex chars)

                if expected_message_hex == message && expected_signer_hex == signer {
                    msg!("✅ WOHOOOOOO");
                    msg!("✅ Signature verification passed.");
                    return Ok(());
                }
            }
        } 
        else {
            msg!("❌ Failed to load instruction at index {}", i);
        }
    }

    msg!("❌ No valid Ed25519 instruction found matching the expected signer and message.");
    Err(ErrorCode::InvalidInstructionData.into())

}