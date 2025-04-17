use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ReleaseDecryptionKey<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    /// CHECK: Required for Ed25519 signature verification
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn release_decryption_key(
    ctx: Context<ReleaseDecryptionKey>,
    decryption_key: String,
) -> Result<()> {
    let election = &mut ctx.accounts.election;

    require!(ctx.accounts.user.key == &election.voting_authority, ErrorCode::Unauthorized);
    
    // Only allow setting once
    require!(
        election.va_decryption_key.is_none(),
        ErrorCode::DecryptionKeyAlreadyReleased
    );

    let clock = Clock::get()?;

    require!(clock.unix_timestamp >= election.reveal_end_time.unwrap(), ErrorCode::RevealPhaseStillActive);


    // Set the decryption key
    election.va_decryption_key = Some(decryption_key);

    Ok(())
}
