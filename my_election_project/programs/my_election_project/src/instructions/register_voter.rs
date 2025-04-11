use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::errors::ErrorCode;
use crate::verify_signature::verify_signature;
use crate::{VerifySignature, VerifySignatureBumps};
use bs58;


#[derive(Accounts)]
#[instruction(voter_public_key: Pubkey, voter_stake: u64)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(init_if_needed, payer = voting_authority, space = 8 + 256, seeds = [b"voter", voter_public_key.as_ref()], bump)]
    pub voter: Account<'info, Voter>,
    #[account(mut, signer)]
    pub voting_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn register_voter(ctx: Context<RegisterVoter>, voter_public_key: Pubkey, voter_stake: u64) -> Result<()> {
    let election = &mut ctx.accounts.election;

    let instruction_sysvar = &ctx.accounts.instructions_sysvar;
    msg!("Instructions Sysvar Account: {:?}", instruction_sysvar);

    
    // Ensure election is not active
    if election.is_active {
        msg!("❌ Cannot register, election is active.");
        return Err(ErrorCode::VotingAlreadyStarted.into());
    }

    // Ensure the user calling the function is the Voting Authority (VA)
    if election.voting_authority != *ctx.accounts.voting_authority.key {
        return Err(ErrorCode::Unauthorized.into());
    }

    // Ensure PDA is correctly derived (for debugging & verification)
    let (expected_voter_pda, _bump) =
        Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], &crate::ID);

    if expected_voter_pda != ctx.accounts.voter.key() {
        return Err(ErrorCode::InvalidPDA.into());
    }

    // A newly initialized PDA (via init_if_needed) will have voter_address set to Pubkey::default().
    // If the PDA already existed, then voter_address would already contain a voter's public key.
    //  **Check if voter PDA is already registered**
    if ctx.accounts.voter.voter_address != Pubkey::default() {
        return Err(ErrorCode::VoterAlreadyRegistered.into());
    }

    let expected_signer = election.voting_authority;

    let mut expected_message = Vec::new();
    
    // Encode the public key in Base58 (like in JavaScript)
    let pubkey_bs58 = bs58::encode(voter_public_key.to_bytes()).into_string();
    expected_message.extend_from_slice(pubkey_bs58.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // Convert stake to string and append
    let stake_str = voter_stake.to_string();
    expected_message.extend_from_slice(stake_str.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // Append election ID
    expected_message.extend_from_slice(election.election_id.as_bytes());
    

    // Construct a new context correctly

    verify_signature(
        Context::new(&crate::ID, &mut VerifySignature {
            instructions: ctx.accounts.instructions_sysvar.clone(),
        }, &[], VerifySignatureBumps::default()),
        &expected_signer,
        &expected_message
    )?;
    // Register the voter after verification
    let voter = &mut ctx.accounts.voter;
    voter.voter_address = voter_public_key;
    voter.has_committed = false;
    voter.has_revealed = false;
    voter.commitment = Vec::new();
    voter.voter_stake = voter_stake;
    voter.encrypted_vote = None;

    msg!("Voter's stake: {:?}", voter.voter_stake);

    Ok(())
}