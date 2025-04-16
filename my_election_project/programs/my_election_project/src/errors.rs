use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid commit duration.")]
    InvalidCommitDuration,

    #[msg("Invalid reveal duration.")]
    InvalidRevealDuration,

    #[msg("Commit phase not ended.")]
    CommitPhaseNotEnded,

    #[msg("Voting has already started.")]
    VotingAlreadyStarted,

    #[msg("Voting hasn't started yet.")]
    VotingNotActive,

    #[msg("Voting is still active.")]
    ElectionStillActive,

    #[msg("Reveal Period ended")]
    RevealPeriodEnded,

    #[msg("Reveal time not set")]
    RevealEndTimeNotSet,

    #[msg("Reveal phase not started")]
    RevealPhaseNotStarted,

    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("The results must be committed before ending the voting.")]
    ResultsNotCommitted,

    #[msg("This voter is already registered.")]
    VoterAlreadyRegistered,

    #[msg("PDA not correct for Voter account.")]
    InvalidPDA,

    #[msg("Invalid signature.")]
    InvalidSignature,

    #[msg("Invalid Public Key.")]
    InvalidPublicKey,

    #[msg("Hash already committed.")]
    AlreadyCommitted,

    #[msg("Invalid vote reveal - wrong hash computation.")]
    InvalidVoteReveal,

    #[msg("Vote not committed.")]
    VoteNotCommitted,

    #[msg("Vote already revealed.")]
    VoteAlreadyRevealed,

    #[msg("Encryption key already set.")]
    EncryptionKeyAlreadySet,

    #[msg("Invalid Instruction Data.")]
    InvalidInstructionData,

    #[msg("Invalid Argument.")]
    InvalidArgument,

    #[msg("Invalid Account Data.")]
    InvalidAccountData,

    #[msg("Not Found Instruction.")]
    NotFound,

    #[msg("Invalid certificate passed.")]
    InvalidCertificate,

    #[msg("Overflow occurred during arithmetic operation.")]
    Overflow,

    #[msg("Value of the stake too big.")]
    ValueTooLarge,
}