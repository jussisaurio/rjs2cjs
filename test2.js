define(['jquery', 'ko', 'viewmodel'], ($, ko, ViewModel) => {
  $(document).ready(function() {
      ko.applyBindings(new ViewModel("John", "Smith"));
  });
});