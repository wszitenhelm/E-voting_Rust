use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::verify_certificate::verify_certificate;
use crate::verify_voter_signature::verify_voter_signature;
use crate::{VerifyVoterSignature, VerifyVoterSignatureBumps};
//use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CommitVote<'info> {
    #[account(mut)]
    pub voter_pda: Account<'info, Voter>, // Voter account (to store the commitment)
    #[account(mut)]
    pub election: Account<'info, Election>, // Election account to access election ID and authority
    #[account(mut, signer)]
    pub user: Signer<'info>,
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>, // System instruction data for verifying signatures
}

pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>, certificate: Vec<u8>) -> Result<()> {
    let voter = &mut ctx.accounts.voter_pda;
    let election = &ctx.accounts.election;
    let user = &ctx.accounts.user;

    let voter_commiment = &commitment;
    let voting_authority = ctx.accounts.election.voting_authority; // Immutable borrow

    //let expected_signer = voting_authority;

    // VERIFY CERTIFICATE
    let mut expected_message = Vec::new();
    
    // Encode the public key in Base58 (like in JavaScript)
    let pubkey_bs58 = bs58::encode(voter.voter_address.to_bytes()).into_string();
    expected_message.extend_from_slice(pubkey_bs58.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // Convert stake to string and append
    let stake_str = voter.voter_stake.to_string();
    expected_message.extend_from_slice(stake_str.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // Append election ID
    expected_message.extend_from_slice(election.election_id.as_bytes());
    
    verify_certificate(&voting_authority, &expected_message, certificate)?;


    // VERIFY SIGNED COMMITMENT 

    // Call the verify_signature function to check if Voter signed the hash
    // and called Ed25519SigVerify before
    let expected_signer_voter = voter.voter_address;

    // Construct a new context correctly
    
    verify_voter_signature(
            Context::new(&crate::ID, &mut VerifyVoterSignature {
                instructions: ctx.accounts.instructions_sysvar.clone(),
            }, &[], VerifyVoterSignatureBumps::default()),
            &expected_signer_voter,
            &commitment
    )?;


    // Step 3: Update the Voter account with the commitment and other fields
    voter.commitment = voter_commiment.to_vec();
    voter.has_committed = true; // Mark that the voter has committed their vote

    msg!("Vote committed successfully for voter: {:?}", user.key());
    Ok(())
}
