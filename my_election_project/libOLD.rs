#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use solana_program::{account_info::AccountInfo, program_error::ProgramError, sysvar::Sysvar};

declare_id!("8bP99pZpRyWi7np5oe5uvxfsByNQscFdbwPxhrzuf75i"); // Temporary for testing.

#[program]
mod voting_program {
    use super::*; // bring everything from the parent module into scope

    // pub fn initialize(
    //     ctx: Context<Initialize>,
    //     election_name: String,
    //     voting_authority: Pubkey,
    //     election_id: String,
    // ) -> Result<()> {
    //     // &mut created mutable reference to modify election account
    //     let election = &mut ctx.accounts.election;
    //     election.name = election_name;
    //     election.is_active = false;
    //     election.votes_committed = false;
    //     election.votes_revealed = false;

    //     election.admin = *ctx.accounts.user.key; // Set the admin to the user calling the function
    //     election.voting_authority = voting_authority;

    //     election.election_id = election_id;

    //     // Initialize vote counts
    //     election.yes_votes = 0;
    //     election.no_votes = 0;

    //     // Initialize vote options inside the election account
    //     // election.votes = vec![
    //     //     VoteOption {
    //     //         name: "yes".to_string(),
    //     //         vote_count: 0,
    //     //     },
    //     //     VoteOption {
    //     //         name: "no".to_string(),
    //     //         vote_count: 0,
    //     //     },
    //     // ];

    //     Ok(())
    // }

    // pub fn start_voting(ctx: Context<StartVoting>) -> Result<()> {
    //     let election = &mut ctx.accounts.election;
    //     let user = &ctx.accounts.user;

    //     check_admin(&election, user)?;

    //     election.is_active = true;

    //     Ok(())
    // }

    // pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
    //     let election = &mut ctx.accounts.election;
    //     let user = &ctx.accounts.user;

    //     // Ensure that the user calling the function is the admin
    //     if election.admin != *user.key {
    //         return Err(ErrorCode::Unauthorized.into());
    //     }

    //     // Check that the results have been committed before ending the voting
    //     //if !election.results_committed {
    //     //return Err(ErrorCode::ResultsNotCommitted.into());
    //     //}

    //     election.is_active = false;

    //     Ok(())
    // }

    // pub fn register_voter(
    //     ctx: Context<RegisterVoter>,
    //     voter_public_key: Pubkey,
    //     voter_stake: u64,
    // ) -> Result<()> {
    //     // Access accounts
    //     let voting_authority = ctx.accounts.election.voting_authority; // Immutable borrow
    //     let election = &mut ctx.accounts.election;
    //     let instructions = &ctx.accounts.instructions_sysvar;

    //     // msg!("Stored Voting Authority: {:?}", election.voting_authority);
    //     // msg!("Signer (User) Key: {:?}", ctx.accounts.user.key());

    //     // Ensure election is not active
    //     if election.is_active {
    //         return Err(ErrorCode::VotingAlreadyStarted.into());
    //     }

    //     // Ensure the user calling the function is the Voting Authority (VA)
    //     let user = &ctx.accounts.user;
    //     if election.voting_authority != *user.key {
    //         return Err(ErrorCode::Unauthorized.into());
    //     }

    //     // Ensure PDA is correctly derived (for debugging & verification)
    //     let (expected_voter_pda, _bump) =
    //         Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], &crate::ID);

    //     if expected_voter_pda != ctx.accounts.voter.key() {
    //         return Err(ErrorCode::InvalidPDA.into());
    //     }

    //     // A newly initialized PDA (via init_if_needed) will have voter_address set to Pubkey::default().
    //     // If the PDA already existed, then voter_address would already contain a voter's public key.
    //     //  **Check if voter PDA is already registered**
    //     if ctx.accounts.voter.voter_address != Pubkey::default() {
    //         return Err(ErrorCode::VoterAlreadyRegistered.into());
    //     }

    //     // Verify the signature using the helper function
    //     let expected_signer = voting_authority;
    //     let mut expected_message = Vec::new();
    //     expected_message.extend_from_slice(&voter_public_key.to_bytes()); // Voter's public key
    //     expected_message.extend_from_slice(&voter_stake.to_le_bytes()); // Voter's stake
    //     expected_message.extend_from_slice(election.election_id.as_bytes()); // Election ID

    //     verify_signature(instructions, &expected_signer, &expected_message)?;

    //     msg!("Passed Ed25519 verification, proceeding to register voter...");

    //     // Register the voter after verification
    //     let voter: &mut Account<'_, Voter> = &mut ctx.accounts.voter;

    //     let (expected_voter_pda, _) =
    //         Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], ctx.program_id);
    //     msg!("🔍 Correct Expected Voter PDA: {:?}", expected_voter_pda);
    //     msg!("🔍 Voter PDA from Context: {:?}", voter.key());

    //     // voter is already a reference
    //     // msg!("Voter PDA Owner: {:?}", voter.to_account_info().owner);
    //     // msg!("Voter PDA Lamports: {}", voter.to_account_info().lamports());
    //     // msg!("Transaction Signer: {:?}", ctx.accounts.user.key());
    //     // msg!("Expected VA: {:?}", ctx.accounts.election.voting_authority);
    //     // msg!("HEEEELO {:?}");
    //     // msg!("System Program: {:?}", ctx.accounts.system_program.key());

    //     // Initialize the voter's account with default values
    //     voter.voter_address = voter_public_key;
    //     voter.has_committed = false;
    //     voter.has_revealed = false;
    //     voter.commitment = Vec::new();
    //     //voter.vote = None;
    //     voter.voter_stake = voter_stake;
    //     voter.encrypted_vote = None;

    //     msg!("Voter's stake: {:?}", voter.voter_stake);

    //     Ok(())
    }

    // pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
    //     let election = &ctx.accounts.election;
    //     Ok(election.election_id.clone()) // Return election_id // needs cloning as String dont implement Copy trait
    // }

    // pub fn get_voting_authority_public_key(ctx: Context<GetVotingAuthorityPK>) -> Result<Pubkey> {
    //     let election = &ctx.accounts.election;
    //     Ok(election.voting_authority) // doesn't need cloning as Pubkey implementes Copy
    // }

    // pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>) -> Result<()> {
    //     let voter = &mut ctx.accounts.voter_pda;
    //     let election = &ctx.accounts.election;
    //     let user = &ctx.accounts.user;
    //     let instructions = &ctx.accounts.instructions_sysvar;

    //     let voting_authority = ctx.accounts.election.voting_authority; // Immutable borrow

    //     let expected_signer = voting_authority;

    //     let mut expected_message = Vec::new();
    //     expected_message.extend_from_slice(&voter.voter_address.to_bytes()); // Voter's public key
    //     expected_message.extend_from_slice(&voter.voter_stake.to_le_bytes()); // Voter's stake
    //     expected_message.extend_from_slice(election.election_id.as_bytes()); // Election ID

    //     // Call the verify_signature function to check if Voter provided correct certficate signed by VA
    //     // and called Ed25519SigVerify before
    //     verify_signature(instructions, &expected_signer, &expected_message)?;

    //     // Call the verify_signature function to check if Voter signed the hash
    //     // and called Ed25519SigVerify before
    //     let expected_signer_voter = voter.voter_address;

    //     verify_signature(instructions, &expected_signer_voter, &commitment)?;

    //     // Step 3: Update the Voter account with the commitment and other fields
    //     voter.commitment = commitment;
    //     voter.has_committed = true; // Mark that the voter has committed their vote

    //     msg!("Vote committed successfully for voter: {:?}", user.key());
    //     Ok(())
    // }
}

// pub fn check_admin(election: &Election, user: &Signer) -> Result<()> {
//     if election.admin != *user.key {
//         return Err(ErrorCode::Unauthorized.into());
//     }
//     Ok(())
// }

// signature data 64-byte signature + 32-byte public key).
// The signed message is extracted from byte 96 onward.

pub fn verify_signature(
    instructions: &AccountInfo,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<bool> {
    let mut signature_verified = false;

    //msg!(" Checking Sysvar Instructions Account...");
    //msg!("Instructions Sysvar Key: {:?}", instructions.key());

    for i in 0..instructions.data_len() {
        let instruction = match solana_program::sysvar::instructions::load_instruction_at_checked(
            i,
            instructions,
        ) {
            Ok(instr) => instr,
            Err(_) => {
                //msg!("Failed to load instruction at index {}", i);
                continue;
            }
        };

        msg!("🔍 Checking instruction {}: Program ID {:?}",i,instruction.program_id);

        if instruction.program_id != solana_program::ed25519_program::id() {
            //msg!("Skipping non-Ed25519 instruction.");
            continue;
        }

        let sig_data = &instruction.data;

        if sig_data.len() < 96 {
            //msg!("Signature data too short! Length: {}", sig_data.len());
            continue;
        }

        let signed_pubkey = match <[u8; 32]>::try_from(&sig_data[64..96]) {
            Ok(pk) => Pubkey::from(pk),
            Err(_) => {
                //msg!(" Failed to extract public key from signature data!");
                continue;
            }
        };

        //msg!("SIG DAT: {:?}", sig_data);
        //msg!(" Extracted Public Key: {:?}", signed_pubkey);
        //msg!(" Expected Signer: {:?}", expected_signer);

        if signed_pubkey != *expected_signer {
            //msg!("Skipping: Public key does not match expected signer.");
            continue;
        }

        let signed_message = &sig_data[96..];

        //msg!("Extracted Signed Message (Hex): {:x?}", signed_message);
        //msg!(" Expected Message (Hex): {:x?}", expected_message);

        if signed_message != expected_message {
            msg!(" Skipping: Signed message does not match expected message.");
            continue;
        }

        msg!("Successfully verified Ed25519 signature from expected signer!");
        signature_verified = true;
        break;
    }

    if !signature_verified {
        msg!(" No valid Ed25519 signature found!");
        return Err(ProgramError::InvalidInstructionData.into());
    }

    Ok(true)
}

// #[derive(Accounts)]
// pub struct Initialize<'info> {
//     #[account(init, seeds = [b"election", user.key().as_ref()], bump, payer = user, space = 8 + 64 + 8 + 8 + 32 + (8 + 64) * 2 + 32)]
//     pub election: Account<'info, Election>,
//     #[account(mut, signer)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// pub struct StartVoting<'info> {
//     #[account(mut)]
//     pub election: Account<'info, Election>, // The election being activated
//     #[account(mut, signer)] // The signer (admin) who can activate the election
//     pub user: Signer<'info>, // The user triggering the voting start (admin)
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// pub struct EndVoting<'info> {
//     #[account(mut)]
//     pub election: Account<'info, Election>,
//     #[account(mut, signer)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// #[instruction(voter_public_key: Pubkey)]
// pub struct RegisterVoter<'info> {
//     #[account(mut)]
//     pub election: Account<'info, Election>, // The election account
//     #[account(init_if_needed, payer = user, space = 8 + 256, seeds = [b"voter", voter_public_key.as_ref()], bump)]
//     pub voter: Account<'info, Voter>, // Voter account
//     #[account(mut, signer)]
//     pub user: Signer<'info>, // The user registering the voter (Voting Authority)
//     pub system_program: Program<'info, System>,
//     /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
//     #[account(address = solana_program::sysvar::instructions::ID)]
//     pub instructions_sysvar: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct GetElectionId<'info> {
//     #[account(mut)]
//     pub election: Account<'info, Election>,
//     //pub user: Signer<'info>,
// }

// #[derive(Accounts)]
// pub struct GetVotingAuthorityPK<'info> {
//     #[account(mut)]
//     pub election: Account<'info, Election>,
// }

// #[derive(Accounts)]
// pub struct CommitVote<'info> {
//     #[account(mut)]
//     pub voter_pda: Account<'info, Voter>, // Voter account (to store the commitment)
//     #[account(mut)]
//     pub election: Account<'info, Election>, // Election account to access election ID and authority
//     #[account(mut, signer)]
//     pub user: Signer<'info>,
//     /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
//     #[account(address = solana_program::sysvar::instructions::ID)]
//     pub instructions_sysvar: AccountInfo<'info>, // System instruction data for verifying signatures
// }

// #[account]
// pub struct Election {
//     pub election_id: String, // Randomly generated election ID
//     pub name: String,
//     pub is_active: bool,
//     pub votes_committed: bool,
//     pub votes_revealed: bool,
//     pub admin: Pubkey,          // Store the admin's public key
//     pub votes: Vec<VoteOption>, // Store all options in a single account
    // // Direct vote counters
    // pub yes_votes: u64,        // Count of "Yes" votes
    // pub no_votes: u64,         // Count of "No" votes
//     pub voting_authority: Pubkey,
// }

// #[account]
// pub struct Voter {
//     pub voter_address: Pubkey, // public key of the voter user account, not the address of the Voter PDA account itself.
//     pub has_committed: bool,
//     pub has_revealed: bool,
//     // commitment = hash(encrypted(vote + salt) + nonce)
//     pub commitment: Vec<u8>, // Store the cryptographic commitment as a vector of bytes (e.g., SHA256 hash)
//     // encrypted(vote + salt)
//     pub encrypted_vote: Option<Vec<u8>>,
//     pub vote: Option<VoteOption>, // Can store the vote option name
//     pub voter_stake: u64,
// }


// #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
// pub struct VoteOption {
//     pub name: String,
//     pub vote_count: u64,
// }

// #[error_code]
// pub enum ErrorCode {
//     #[msg("Voting has already started.")]
//     VotingAlreadyStarted,

//     #[msg("You are not authorized to perform this action.")]
//     Unauthorized,

//     #[msg("The results must be committed before ending the voting.")]
//     ResultsNotCommitted,

//     #[msg("This voter is already registered.")]
//     VoterAlreadyRegistered,

//     #[msg("PDA not correct for Voter account.")]
//     InvalidPDA,

//     #[msg("Invalid signature")]
//     InvalidSignature,

//     #[msg("Invalid Public Key")]
//     InvalidPublicKey,
// }
